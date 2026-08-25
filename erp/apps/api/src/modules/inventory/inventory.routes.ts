import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { Prisma, prisma } from "@erp/database";
import {
  confirmInventoryCountBodySchema,
  createInventoryCountBodySchema,
  createStockTransferBodySchema,
  stockAdjustmentBodySchema,
  stockBalanceQuerySchema,
  transitionStockTransferBodySchema
} from "@erp/contracts";
import { assertPermission, errors } from "@erp/security";
import { parseBody, parseParams, parseQuery } from "../../lib/zod.js";

const idParamsSchema = z.object({ id: z.string().cuid() });

async function audit(request: FastifyRequest, input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const tenant = request.tenant!;
  await prisma.auditLog.create({
    data: {
      companyId: tenant.companyId,
      branchId: tenant.branchId,
      userId: tenant.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before === undefined ? undefined : JSON.parse(JSON.stringify(input.before)),
      after: input.after === undefined ? undefined : JSON.parse(JSON.stringify(input.after)),
      ip: request.ip,
      userAgent: request.headers["user-agent"]?.toString() ?? null,
      correlationId: request.correlationId
    }
  });
}

function pagination(query: { limit: number; cursor?: string | undefined }) {
  return {
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
  };
}

function paginated<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return { data, nextCursor: hasMore ? data.at(-1)?.id : null };
}

async function assertBranch(companyId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId, active: true },
    select: { id: true }
  });

  if (!branch) {
    throw errors.notFound("BRANCH_NOT_FOUND", "Loja não encontrada.");
  }

  return branch;
}

async function assertWarehouse(companyId: string, branchId: string, warehouseId: string) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, companyId, branchId, active: true },
    select: { id: true }
  });

  if (!warehouse) {
    throw errors.notFound("WAREHOUSE_NOT_FOUND", "Depósito não encontrado.");
  }

  return warehouse;
}

async function assertProducts(companyId: string, productIds: string[]) {
  const uniqueProductIds = [...new Set(productIds)];
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds }, companyId, active: true },
    select: { id: true }
  });

  if (products.length !== uniqueProductIds.length) {
    throw errors.notFound("PRODUCT_NOT_FOUND", "Um ou mais produtos não foram encontrados.");
  }
}

async function changeStock(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    branchId: string;
    warehouseId: string;
    productId: string;
    delta: Prisma.Decimal;
    movementType: "MANUAL_ADJUSTMENT" | "TRANSFER_IN" | "TRANSFER_OUT" | "INVENTORY_ADJUSTMENT";
    reason: string;
    userId: string;
    idempotencyKey: string;
    referenceType?: string | undefined;
    referenceId?: string | undefined;
  }
) {
  const existingMovement = await tx.stockMovement.findUnique({
    where: {
      companyId_idempotencyKey: {
        companyId: input.companyId,
        idempotencyKey: input.idempotencyKey
      }
    },
    select: { id: true, currentQuantity: true }
  });

  if (existingMovement) {
    return existingMovement;
  }

  const balance = await tx.stockBalance.upsert({
    where: {
      companyId_branchId_warehouseId_productId: {
        companyId: input.companyId,
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        productId: input.productId
      }
    },
    create: {
      companyId: input.companyId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      quantity: new Prisma.Decimal(0)
    },
    update: {},
    select: { id: true, quantity: true }
  });

  const previous = new Prisma.Decimal(balance.quantity);
  const current = previous.plus(input.delta);

  if (current.lessThan(0)) {
    throw errors.conflict("INSUFFICIENT_STOCK", "Estoque insuficiente.");
  }

  const updated = input.delta.lessThan(0)
    ? await tx.$executeRaw`
        UPDATE StockBalance
        SET quantity = quantity + ${input.delta}
        WHERE id = ${balance.id}
          AND quantity - reservedQuantity >= ${input.delta.abs()}
      `
    : (
        await tx.stockBalance.updateMany({
          where: { id: balance.id },
          data: { quantity: { increment: input.delta } }
        })
      ).count;

  if (updated !== 1) {
    throw errors.conflict("INSUFFICIENT_STOCK", "Estoque insuficiente.");
  }

  return tx.stockMovement.create({
    data: {
      companyId: input.companyId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      type: input.movementType,
      quantity: input.delta,
      previousQuantity: previous,
      currentQuantity: current,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      reason: input.reason,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey
    },
    select: { id: true, currentQuantity: true }
  });
}

export async function inventoryRoutes(app: FastifyInstance) {
  app.get("/api/v1/inventory/balances", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.read");
    const query = parseQuery(stockBalanceQuerySchema, request);
    const items = await prisma.stockBalance.findMany({
      where: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.search
          ? {
              product: {
                OR: [{ name: { contains: query.search } }, { sku: { contains: query.search } }]
              }
            }
          : {})
      },
      select: {
        id: true,
        quantity: true,
        reservedQuantity: true,
        updatedAt: true,
        warehouse: { select: { id: true, name: true } },
        product: { select: { id: true, sku: true, name: true, unit: true } }
      },
      orderBy: { updatedAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.get("/api/v1/inventory/movements", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.read");
    const query = parseQuery(stockBalanceQuerySchema, request);
    const items = await prisma.stockMovement.findMany({
      where: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.search
          ? {
              product: {
                OR: [{ name: { contains: query.search } }, { sku: { contains: query.search } }]
              }
            }
          : {})
      },
      select: {
        id: true,
        type: true,
        quantity: true,
        previousQuantity: true,
        currentQuantity: true,
        reason: true,
        createdAt: true,
        product: { select: { id: true, sku: true, name: true, unit: true } },
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/inventory/adjustments", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "inventory.adjust");
    const body = parseBody(stockAdjustmentBodySchema, request);
    const delta = new Prisma.Decimal(body.quantityDelta);

    const product = await prisma.product.findFirst({
      where: { id: body.productId, companyId: request.tenant!.companyId, active: true },
      select: { id: true }
    });

    if (!product) {
      throw errors.notFound("PRODUCT_NOT_FOUND", "Produto não encontrado.");
    }

    const warehouse = await assertWarehouse(request.tenant!.companyId, request.tenant!.branchId, body.warehouseId);

    const movement = await prisma.$transaction(async (tx) => {
      const result = await changeStock(tx, {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        warehouseId: warehouse.id,
        productId: product.id,
        delta,
        movementType: "MANUAL_ADJUSTMENT",
        reason: body.reason,
        userId: request.tenant!.userId,
        idempotencyKey: body.idempotencyKey
      });

      return tx.stockMovement.findUniqueOrThrow({
        where: { id: result.id },
        select: {
          id: true,
          type: true,
          quantity: true,
          previousQuantity: true,
          currentQuantity: true,
          reason: true,
          createdAt: true
        }
      });
    });

    await audit(request, {
      action: "inventory.adjust",
      entityType: "StockMovement",
      entityId: movement.id,
      after: movement
    });

    return reply.status(201).send(movement);
  });

  app.get("/api/v1/inventory/transfers", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.read");
    const query = parseQuery(stockBalanceQuerySchema, request);
    const items = await prisma.stockTransfer.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ sourceBranchId: request.tenant!.branchId }, { destinationBranchId: request.tenant!.branchId }]
      },
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
        sentAt: true,
        receivedAt: true,
        sourceBranch: { select: { id: true, name: true } },
        sourceWarehouse: { select: { id: true, name: true } },
        destinationBranch: { select: { id: true, name: true } },
        destinationWarehouse: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            product: { select: { id: true, sku: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/inventory/transfers", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "inventory.transfer");
    const body = parseBody(createStockTransferBodySchema, request);
    await assertWarehouse(request.tenant!.companyId, request.tenant!.branchId, body.sourceWarehouseId);
    await assertBranch(request.tenant!.companyId, body.destinationBranchId);
    await assertWarehouse(request.tenant!.companyId, body.destinationBranchId, body.destinationWarehouseId);
    await assertProducts(request.tenant!.companyId, body.items.map((item) => item.productId));

    const transfer = await prisma.stockTransfer.create({
      data: {
        companyId: request.tenant!.companyId,
        sourceBranchId: request.tenant!.branchId,
        sourceWarehouseId: body.sourceWarehouseId,
        destinationBranchId: body.destinationBranchId,
        destinationWarehouseId: body.destinationWarehouseId,
        reason: body.reason ?? null,
        createdBy: request.tenant!.userId,
        idempotencyKey: body.idempotencyKey,
        items: {
          create: body.items.map((item) => ({
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity)
          }))
        }
      },
      select: { id: true, status: true, reason: true, createdAt: true }
    });

    await audit(request, { action: "stock_transfer.create", entityType: "StockTransfer", entityId: transfer.id, after: transfer });
    return reply.status(201).send(transfer);
  });

  app.post("/api/v1/inventory/transfers/:id/send", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.transfer");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(transitionStockTransferBodySchema, request);

    const transfer = await prisma.$transaction(async (tx) => {
      const current = await tx.stockTransfer.findFirst({
        where: { id: params.id, companyId: request.tenant!.companyId, sourceBranchId: request.tenant!.branchId },
        select: {
          id: true,
          status: true,
          sourceWarehouseId: true,
          reason: true,
          items: { select: { productId: true, quantity: true } }
        }
      });

      if (!current) {
        throw errors.notFound("STOCK_TRANSFER_NOT_FOUND", "Transferência não encontrada.");
      }

      if (current.status === "IN_TRANSIT" || current.status === "RECEIVED") {
        return current;
      }

      if (current.status !== "DRAFT" && current.status !== "PENDING") {
        throw errors.conflict("INVALID_TRANSFER_STATUS", "Esta transferência não pode ser enviada.");
      }

      for (const item of current.items) {
        await changeStock(tx, {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          warehouseId: current.sourceWarehouseId,
          productId: item.productId,
          delta: new Prisma.Decimal(item.quantity).negated(),
          movementType: "TRANSFER_OUT",
          referenceType: "StockTransfer",
          referenceId: current.id,
          reason: current.reason ?? "Transferência de estoque",
          userId: request.tenant!.userId,
          idempotencyKey: `${body.idempotencyKey}:out:${item.productId}`
        });
      }

      return tx.stockTransfer.update({
        where: { id: current.id },
        data: { status: "IN_TRANSIT", sentBy: request.tenant!.userId, sentAt: new Date() },
        select: { id: true, status: true, sentAt: true }
      });
    });

    await audit(request, { action: "stock_transfer.send", entityType: "StockTransfer", entityId: transfer.id, after: transfer });
    return transfer;
  });

  app.post("/api/v1/inventory/transfers/:id/receive", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.transfer");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(transitionStockTransferBodySchema, request);

    const transfer = await prisma.$transaction(async (tx) => {
      const current = await tx.stockTransfer.findFirst({
        where: { id: params.id, companyId: request.tenant!.companyId, destinationBranchId: request.tenant!.branchId },
        select: {
          id: true,
          status: true,
          destinationWarehouseId: true,
          reason: true,
          items: { select: { productId: true, quantity: true } }
        }
      });

      if (!current) {
        throw errors.notFound("STOCK_TRANSFER_NOT_FOUND", "Transferência não encontrada.");
      }

      if (current.status === "RECEIVED") {
        return current;
      }

      if (current.status !== "IN_TRANSIT") {
        throw errors.conflict("INVALID_TRANSFER_STATUS", "Esta transferência ainda não pode ser recebida.");
      }

      for (const item of current.items) {
        await changeStock(tx, {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          warehouseId: current.destinationWarehouseId,
          productId: item.productId,
          delta: new Prisma.Decimal(item.quantity),
          movementType: "TRANSFER_IN",
          referenceType: "StockTransfer",
          referenceId: current.id,
          reason: current.reason ?? "Recebimento de transferência",
          userId: request.tenant!.userId,
          idempotencyKey: `${body.idempotencyKey}:in:${item.productId}`
        });
      }

      return tx.stockTransfer.update({
        where: { id: current.id },
        data: { status: "RECEIVED", receivedBy: request.tenant!.userId, receivedAt: new Date() },
        select: { id: true, status: true, receivedAt: true }
      });
    });

    await audit(request, { action: "stock_transfer.receive", entityType: "StockTransfer", entityId: transfer.id, after: transfer });
    return transfer;
  });

  app.get("/api/v1/inventory/counts", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.read");
    const query = parseQuery(stockBalanceQuerySchema, request);
    const items = await prisma.inventoryCount.findMany({
      where: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        ...(query.warehouseId ? { warehouseId: query.warehouseId } : {})
      },
      select: {
        id: true,
        status: true,
        notes: true,
        createdAt: true,
        confirmedAt: true,
        warehouse: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            countedQuantity: true,
            expectedQuantity: true,
            differenceQuantity: true,
            product: { select: { id: true, sku: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/inventory/counts", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "inventory.adjust");
    const body = parseBody(createInventoryCountBodySchema, request);
    await assertWarehouse(request.tenant!.companyId, request.tenant!.branchId, body.warehouseId);
    await assertProducts(request.tenant!.companyId, body.items.map((item) => item.productId));

    const count = await prisma.inventoryCount.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        warehouseId: body.warehouseId,
        notes: body.notes ?? null,
        createdBy: request.tenant!.userId,
        idempotencyKey: body.idempotencyKey,
        items: {
          create: body.items.map((item) => ({
            productId: item.productId,
            countedQuantity: new Prisma.Decimal(item.countedQuantity)
          }))
        }
      },
      select: { id: true, status: true, createdAt: true }
    });

    await audit(request, { action: "inventory_count.create", entityType: "InventoryCount", entityId: count.id, after: count });
    return reply.status(201).send(count);
  });

  app.post("/api/v1/inventory/counts/:id/confirm", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.adjust");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(confirmInventoryCountBodySchema, request);

    const count = await prisma.$transaction(async (tx) => {
      const current = await tx.inventoryCount.findFirst({
        where: { id: params.id, companyId: request.tenant!.companyId, branchId: request.tenant!.branchId },
        select: {
          id: true,
          status: true,
          warehouseId: true,
          items: { select: { id: true, productId: true, countedQuantity: true } }
        }
      });

      if (!current) {
        throw errors.notFound("INVENTORY_COUNT_NOT_FOUND", "Inventário não encontrado.");
      }

      if (current.status === "CONFIRMED") {
        return current;
      }

      if (current.status !== "DRAFT") {
        throw errors.conflict("INVALID_INVENTORY_STATUS", "Este inventário não pode ser confirmado.");
      }

      for (const item of current.items) {
        const balance = await tx.stockBalance.upsert({
          where: {
            companyId_branchId_warehouseId_productId: {
              companyId: request.tenant!.companyId,
              branchId: request.tenant!.branchId,
              warehouseId: current.warehouseId,
              productId: item.productId
            }
          },
          create: {
            companyId: request.tenant!.companyId,
            branchId: request.tenant!.branchId,
            warehouseId: current.warehouseId,
            productId: item.productId,
            quantity: new Prisma.Decimal(0)
          },
          update: {},
          select: { quantity: true }
        });

        const expected = new Prisma.Decimal(balance.quantity);
        const counted = new Prisma.Decimal(item.countedQuantity);
        const difference = counted.minus(expected);

        await tx.inventoryCountItem.update({
          where: { id: item.id },
          data: { expectedQuantity: expected, differenceQuantity: difference }
        });

        if (!difference.equals(0)) {
          await changeStock(tx, {
            companyId: request.tenant!.companyId,
            branchId: request.tenant!.branchId,
            warehouseId: current.warehouseId,
            productId: item.productId,
            delta: difference,
            movementType: "INVENTORY_ADJUSTMENT",
            referenceType: "InventoryCount",
            referenceId: current.id,
            reason: "Ajuste por contagem física",
            userId: request.tenant!.userId,
            idempotencyKey: `${body.idempotencyKey}:inventory:${item.productId}`
          });
        }
      }

      return tx.inventoryCount.update({
        where: { id: current.id },
        data: { status: "CONFIRMED", confirmedBy: request.tenant!.userId, confirmedAt: new Date() },
        select: { id: true, status: true, confirmedAt: true }
      });
    });

    await audit(request, { action: "inventory_count.confirm", entityType: "InventoryCount", entityId: count.id, after: count });
    return count;
  });
}
