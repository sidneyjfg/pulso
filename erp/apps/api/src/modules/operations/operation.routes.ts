import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  cancelPurchaseBodySchema,
  cancelSaleBodySchema,
  createPurchaseBodySchema,
  createSaleBodySchema,
  listQuerySchema,
  receivePurchaseBodySchema
} from "@erp/contracts";
import { Prisma, prisma } from "@erp/database";
import { assertPermission, errors } from "@erp/security";
import { parseBody, parseParams, parseQuery } from "../../lib/zod.js";

const idParamsSchema = z.object({ id: z.string().cuid() });

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

async function audit(
  request: FastifyRequest,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  }
) {
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

async function assertCustomer(companyId: string, customerId: string | undefined) {
  if (!customerId) {
    return null;
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId, active: true },
    select: { id: true }
  });

  if (!customer) {
    throw errors.notFound("CUSTOMER_NOT_FOUND", "Cliente não encontrado.");
  }

  return customer;
}

async function assertSupplier(companyId: string, supplierId: string | undefined) {
  if (!supplierId) {
    return null;
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, companyId, active: true },
    select: { id: true }
  });

  if (!supplier) {
    throw errors.notFound("SUPPLIER_NOT_FOUND", "Fornecedor não encontrado.");
  }

  return supplier;
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

function lineTotal(quantity: string, unitValue: string, discount: string) {
  const subtotal = new Prisma.Decimal(quantity).times(new Prisma.Decimal(unitValue));
  const total = subtotal.minus(new Prisma.Decimal(discount));

  if (total.lessThan(0)) {
    throw errors.conflict("INVALID_TOTAL", "O desconto não pode ser maior que o valor do item.");
  }

  return total;
}

function operationTotals(items: { quantity: string; unitValue: string; discount: string }[], discount: string) {
  const subtotal = items.reduce(
    (total, item) => total.plus(lineTotal(item.quantity, item.unitValue, item.discount)),
    new Prisma.Decimal(0)
  );
  const discountValue = new Prisma.Decimal(discount);
  const total = subtotal.minus(discountValue);

  if (total.lessThan(0)) {
    throw errors.conflict("INVALID_TOTAL", "O desconto não pode ser maior que o total.");
  }

  return { subtotal, discount: discountValue, total };
}

async function changeStock(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    branchId: string;
    warehouseId: string;
    productId: string;
    delta: Prisma.Decimal;
    movementType: "PURCHASE" | "SALE" | "CANCEL_SALE";
    reason: string;
    userId: string;
    idempotencyKey: string;
    referenceType: string;
    referenceId: string;
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

  const updated = await tx.stockBalance.updateMany({
    where: {
      id: balance.id,
      ...(input.delta.lessThan(0) ? { quantity: { gte: input.delta.abs() } } : {})
    },
    data: { quantity: { increment: input.delta } }
  });

  if (updated.count !== 1) {
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
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      reason: input.reason,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey
    },
    select: { id: true, currentQuantity: true }
  });
}

const saleSelect = {
  id: true,
  status: true,
  subtotal: true,
  discount: true,
  total: true,
  source: true,
  createdAt: true,
  cancelledAt: true,
  customer: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      discount: true,
      total: true,
      product: { select: { id: true, sku: true, name: true } }
    }
  },
  payments: { select: { id: true, method: true, amount: true } }
} as const;

const purchaseSelect = {
  id: true,
  status: true,
  subtotal: true,
  discount: true,
  total: true,
  createdAt: true,
  receivedAt: true,
  cancelledAt: true,
  supplier: { select: { id: true, name: true } },
  warehouse: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      unitCost: true,
      discount: true,
      total: true,
      product: { select: { id: true, sku: true, name: true } }
    }
  }
} as const;

export async function operationRoutes(app: FastifyInstance) {
  app.get("/api/v1/sales", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "sale.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.sale.findMany({
      where: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        ...(query.search ? { customer: { name: { contains: query.search } } } : {})
      },
      select: saleSelect,
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/sales", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "sale.create");
    const body = parseBody(createSaleBodySchema, request);
    await assertWarehouse(request.tenant!.companyId, request.tenant!.branchId, body.warehouseId);
    await assertCustomer(request.tenant!.companyId, body.customerId);
    await assertProducts(request.tenant!.companyId, body.items.map((item) => item.productId));

    const existing = await prisma.sale.findUnique({
      where: { companyId_idempotencyKey: { companyId: request.tenant!.companyId, idempotencyKey: body.idempotencyKey } },
      select: saleSelect
    });

    if (existing) {
      return existing;
    }

    const totals = operationTotals(
      body.items.map((item) => ({ quantity: item.quantity, unitValue: item.unitPrice, discount: item.discount })),
      body.discount
    );
    const paymentTotal = body.payments.reduce((total, payment) => total.plus(new Prisma.Decimal(payment.amount)), new Prisma.Decimal(0));

    if (body.payments.length > 0 && !paymentTotal.equals(totals.total)) {
      throw errors.conflict("INVALID_PAYMENT_TOTAL", "A soma dos pagamentos precisa fechar com o total da venda.");
    }

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          warehouseId: body.warehouseId,
          customerId: body.customerId ?? null,
          subtotal: totals.subtotal,
          discount: totals.discount,
          total: totals.total,
          source: body.source,
          createdBy: request.tenant!.userId,
          idempotencyKey: body.idempotencyKey,
          items: {
            create: body.items.map((item) => ({
              productId: item.productId,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              discount: new Prisma.Decimal(item.discount),
              total: lineTotal(item.quantity, item.unitPrice, item.discount)
            }))
          },
          payments: {
            create: body.payments.map((payment) => ({
              method: payment.method,
              amount: new Prisma.Decimal(payment.amount)
            }))
          }
        },
        select: { id: true, items: { select: { productId: true, quantity: true } } }
      });

      for (const [index, item] of created.items.entries()) {
        await changeStock(tx, {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          warehouseId: body.warehouseId,
          productId: item.productId,
          delta: new Prisma.Decimal(item.quantity).negated(),
          movementType: "SALE",
          referenceType: "Sale",
          referenceId: created.id,
          reason: "Venda",
          userId: request.tenant!.userId,
          idempotencyKey: `${body.idempotencyKey}:sale:${index}:${item.productId}`
        });
      }

      return tx.sale.findUniqueOrThrow({ where: { id: created.id }, select: saleSelect });
    });

    await audit(request, { action: "sale.create", entityType: "Sale", entityId: sale.id, after: sale });
    return reply.status(201).send(sale);
  });

  app.post("/api/v1/sales/:id/cancel", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "sale.cancel");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(cancelSaleBodySchema, request);

    const sale = await prisma.$transaction(async (tx) => {
      const current = await tx.sale.findFirst({
        where: { id: params.id, companyId: request.tenant!.companyId, branchId: request.tenant!.branchId },
        select: { id: true, status: true, warehouseId: true, items: { select: { productId: true, quantity: true } } }
      });

      if (!current) {
        throw errors.notFound("SALE_NOT_FOUND", "Venda não encontrada.");
      }

      if (current.status === "CANCELLED") {
        return tx.sale.findUniqueOrThrow({ where: { id: current.id }, select: saleSelect });
      }

      for (const [index, item] of current.items.entries()) {
        await changeStock(tx, {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          warehouseId: current.warehouseId,
          productId: item.productId,
          delta: new Prisma.Decimal(item.quantity),
          movementType: "CANCEL_SALE",
          referenceType: "Sale",
          referenceId: current.id,
          reason: body.reason,
          userId: request.tenant!.userId,
          idempotencyKey: `${body.idempotencyKey}:cancel-sale:${index}:${item.productId}`
        });
      }

      await tx.sale.update({
        where: { id: current.id },
        data: { status: "CANCELLED", cancelledBy: request.tenant!.userId, cancelledAt: new Date(), cancelReason: body.reason }
      });

      return tx.sale.findUniqueOrThrow({ where: { id: current.id }, select: saleSelect });
    });

    await audit(request, { action: "sale.cancel", entityType: "Sale", entityId: sale.id, after: sale });
    return sale;
  });

  app.get("/api/v1/purchases", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "purchase.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.purchase.findMany({
      where: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        ...(query.search ? { supplier: { name: { contains: query.search } } } : {})
      },
      select: purchaseSelect,
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/purchases", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "purchase.create");
    const body = parseBody(createPurchaseBodySchema, request);
    await assertWarehouse(request.tenant!.companyId, request.tenant!.branchId, body.warehouseId);
    await assertSupplier(request.tenant!.companyId, body.supplierId);
    await assertProducts(request.tenant!.companyId, body.items.map((item) => item.productId));

    const existing = await prisma.purchase.findUnique({
      where: { companyId_idempotencyKey: { companyId: request.tenant!.companyId, idempotencyKey: body.idempotencyKey } },
      select: purchaseSelect
    });

    if (existing) {
      return existing;
    }

    const totals = operationTotals(
      body.items.map((item) => ({ quantity: item.quantity, unitValue: item.unitCost, discount: item.discount })),
      body.discount
    );

    const purchase = await prisma.purchase.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        warehouseId: body.warehouseId,
        supplierId: body.supplierId ?? null,
        status: body.status,
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        createdBy: request.tenant!.userId,
        idempotencyKey: body.idempotencyKey,
        items: {
          create: body.items.map((item) => ({
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitCost: new Prisma.Decimal(item.unitCost),
            discount: new Prisma.Decimal(item.discount),
            total: lineTotal(item.quantity, item.unitCost, item.discount)
          }))
        }
      },
      select: purchaseSelect
    });

    await audit(request, { action: "purchase.create", entityType: "Purchase", entityId: purchase.id, after: purchase });
    return reply.status(201).send(purchase);
  });

  app.post("/api/v1/purchases/:id/receive", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "purchase.receive");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(receivePurchaseBodySchema, request);

    const purchase = await prisma.$transaction(async (tx) => {
      const current = await tx.purchase.findFirst({
        where: { id: params.id, companyId: request.tenant!.companyId, branchId: request.tenant!.branchId },
        select: { id: true, status: true, warehouseId: true, items: { select: { id: true, productId: true, quantity: true } } }
      });

      if (!current) {
        throw errors.notFound("PURCHASE_NOT_FOUND", "Compra não encontrada.");
      }

      if (current.status === "RECEIVED") {
        return tx.purchase.findUniqueOrThrow({ where: { id: current.id }, select: purchaseSelect });
      }

      if (current.status === "CANCELLED") {
        throw errors.conflict("INVALID_PURCHASE_STATUS", "Esta compra foi cancelada.");
      }

      for (const [index, item] of current.items.entries()) {
        await changeStock(tx, {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          warehouseId: current.warehouseId,
          productId: item.productId,
          delta: new Prisma.Decimal(item.quantity),
          movementType: "PURCHASE",
          referenceType: "Purchase",
          referenceId: current.id,
          reason: "Recebimento de compra",
          userId: request.tenant!.userId,
          idempotencyKey: `${body.idempotencyKey}:purchase:${index}:${item.productId}`
        });
      }

      await tx.purchaseItem.updateMany({
        where: { purchaseId: current.id },
        data: { receivedAt: new Date() }
      });

      await tx.purchase.update({
        where: { id: current.id },
        data: { status: "RECEIVED", receivedBy: request.tenant!.userId, receivedAt: new Date() }
      });

      return tx.purchase.findUniqueOrThrow({ where: { id: current.id }, select: purchaseSelect });
    });

    await audit(request, { action: "purchase.receive", entityType: "Purchase", entityId: purchase.id, after: purchase });
    return purchase;
  });

  app.post("/api/v1/purchases/:id/cancel", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "purchase.create");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(cancelPurchaseBodySchema, request);
    const existing = await prisma.purchase.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, branchId: request.tenant!.branchId },
      select: { id: true, status: true }
    });

    if (!existing) {
      throw errors.notFound("PURCHASE_NOT_FOUND", "Compra não encontrada.");
    }

    if (existing.status === "RECEIVED") {
      throw errors.conflict("INVALID_PURCHASE_STATUS", "Compra recebida não pode ser cancelada por este fluxo.");
    }

    const purchase = await prisma.purchase.update({
      where: { id: existing.id },
      data: { status: "CANCELLED", cancelledBy: request.tenant!.userId, cancelledAt: new Date(), cancelReason: body.reason },
      select: purchaseSelect
    });

    await audit(request, { action: "purchase.cancel", entityType: "Purchase", entityId: purchase.id, before: existing, after: purchase });
    return purchase;
  });
}
