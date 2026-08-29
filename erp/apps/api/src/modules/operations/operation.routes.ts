import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  cancelPurchaseBodySchema,
  cancelSaleBodySchema,
  cancelFinancialEntryBodySchema,
  createPurchaseBodySchema,
  createSaleBodySchema,
  financialEntryListQuerySchema,
  listQuerySchema,
  receivePurchaseBodySchema,
  settleFinancialEntryBodySchema
} from "@erp/contracts";
import { Prisma, prisma } from "@erp/database";
import { assertPermission, errors } from "@erp/security";
import { parseBody, parseParams, parseQuery } from "../../lib/zod.js";
import { calculateIfoodInventoryAmount, resolveIfoodAccessToken, updateIfoodInventory } from "../growth/ifood.service.js";

const idParamsSchema = z.object({ id: z.string().cuid() });
const saleListQuerySchema = listQuerySchema.extend({
  source: z.enum(["MANUAL", "POS", "IFOOD", "FOOD99", "MARKETPLACE", "ECOMMERCE", "API", "IMPORT", "OTHER"]).optional()
});

const financialDirectionParamsSchema = z.object({
  direction: z.enum(["receivables", "payables"])
});

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

function recordValue(input: unknown) {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

function textValue(input: unknown) {
  return typeof input === "string" && input.trim() ? input.trim() : null;
}

function ifoodOrderIdFromSale(sale: { idempotencyKey: string; source: string }) {
  if (sale.source !== "IFOOD") {
    return null;
  }
  const [, , , orderId] = sale.idempotencyKey.split(":");
  return orderId || null;
}

function ifoodTerminalEventType(eventType: string) {
  if (eventType === "CONCLUDED" || eventType === "DELIVERED" || eventType.endsWith("_CONCLUDED") || eventType.endsWith("_DELIVERED")) {
    return "COMPLETED";
  }
  if (eventType === "CANCELLED" || eventType.endsWith("_CANCELLED")) {
    return "CANCELLED";
  }
  return null;
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

function shouldSyncSaleSourceToIfood(source: string) {
  return source === "POS" || source === "MANUAL";
}

async function syncIfoodInventoryAfterLocalSale(input: { companyId: string; branchId: string; productIds: string[] }) {
  const productIds = [...new Set(input.productIds)];
  if (productIds.length === 0) {
    return;
  }

  const connection = await prisma.integrationConnection.findFirst({
    where: {
      companyId: input.companyId,
      branchId: input.branchId,
      channel: "IFOOD",
      status: { notIn: ["DISCONNECTED", "PAUSED"] },
      externalAccountId: { not: null }
    },
    select: {
      id: true,
      externalAccountId: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      ecommerceStockMode: true,
      ecommerceStockPercent: true,
      ecommerceStockFixedQuantity: true
    }
  });

  if (!connection?.externalAccountId) {
    return;
  }

  const mappings = await prisma.ifoodCatalogItem.findMany({
    where: {
      integrationConnectionId: connection.id,
      productId: { in: productIds },
      status: "SYNCED"
    },
    select: { productId: true, ifoodProductId: true }
  });
  if (mappings.length === 0) {
    return;
  }

  const token = await resolveIfoodAccessToken({
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    tokenExpiresAt: connection.tokenExpiresAt
  });
  if (token.refreshed) {
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: token.refreshed.accessToken,
        ...(token.refreshed.refreshToken ? { refreshToken: token.refreshed.refreshToken } : {}),
        tokenExpiresAt: token.refreshed.tokenExpiresAt
      }
    });
  }

  const balances = await prisma.stockBalance.groupBy({
    by: ["productId"],
    where: {
      companyId: input.companyId,
      branchId: input.branchId,
      productId: { in: mappings.map((item) => item.productId) }
    },
    _sum: { quantity: true, reservedQuantity: true }
  });
  const balanceByProductId = new Map(
    balances.map((item) => [
      item.productId,
      (item._sum.quantity ?? new Prisma.Decimal(0)).minus(item._sum.reservedQuantity ?? new Prisma.Decimal(0))
    ])
  );

  for (const mapping of mappings) {
    const stockQuantity = balanceByProductId.get(mapping.productId) ?? new Prisma.Decimal(0);
    await updateIfoodInventory({
      accessToken: token.accessToken,
      merchantId: connection.externalAccountId,
      productId: mapping.ifoodProductId,
      amount: calculateIfoodInventoryAmount(stockQuantity, connection)
    });
  }
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
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      reason: input.reason,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey
    },
    select: { id: true, currentQuantity: true }
  });
}

async function releaseReservedStock(
  tx: Prisma.TransactionClient,
  input: { companyId: string; branchId: string; warehouseId: string; productId: string; quantity: Prisma.Decimal }
) {
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
    select: { id: true }
  });

  await tx.$executeRaw`
    UPDATE StockBalance
    SET reservedQuantity = GREATEST(reservedQuantity - ${input.quantity}, 0)
    WHERE id = ${balance.id}
  `;
}

const saleSelect = {
  id: true,
  saleNumber: true,
  status: true,
  subtotal: true,
  discount: true,
  total: true,
  source: true,
  idempotencyKey: true,
  createdAt: true,
  cancelledAt: true,
  customer: { select: { id: true, name: true } },
  warehouse: { select: { id: true, name: true } },
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

const financialEntrySelect = {
  id: true,
  direction: true,
  status: true,
  sourceType: true,
  sourceId: true,
  installmentNumber: true,
  installmentTotal: true,
  description: true,
  partyName: true,
  dueDate: true,
  amount: true,
  paidAmount: true,
  interestAmount: true,
  discountAmount: true,
  paymentMethod: true,
  proofUrl: true,
  proofFileName: true,
  paidAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true
} as const;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function createFinancialEntriesForSale(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    branchId: string;
    saleId: string;
    total: Prisma.Decimal;
    paymentsTotal: Prisma.Decimal;
    customerName?: string | null;
    createdBy: string;
  }
) {
  const openAmount = input.total.minus(input.paymentsTotal);
  if (openAmount.lessThanOrEqualTo(0)) {
    return;
  }

  await tx.financialEntry.create({
    data: {
      companyId: input.companyId,
      branchId: input.branchId,
      direction: "RECEIVABLE",
      sourceType: "SALE",
      sourceId: input.saleId,
      description: "Recebimento de venda",
      partyName: input.customerName ?? null,
      dueDate: new Date(),
      amount: openAmount,
      createdBy: input.createdBy
    }
  });
}

async function createFinancialEntriesForPurchase(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    branchId: string;
    purchaseId: string;
    total: Prisma.Decimal;
    supplierName?: string | null;
    createdBy: string;
  }
) {
  await tx.financialEntry.create({
    data: {
      companyId: input.companyId,
      branchId: input.branchId,
      direction: "PAYABLE",
      sourceType: "PURCHASE",
      sourceId: input.purchaseId,
      description: "Pagamento de compra",
      partyName: input.supplierName ?? null,
      dueDate: addDays(new Date(), 30),
      amount: input.total,
      createdBy: input.createdBy
    }
  });
}

function financialWhere(input: { companyId: string; branchId: string; direction: "RECEIVABLE" | "PAYABLE"; status: "ALL" | "OPEN" | "PAID" | "CANCELLED" | "OVERDUE"; search?: string }) {
  return {
    companyId: input.companyId,
    branchId: input.branchId,
    direction: input.direction,
    ...(input.status === "ALL" ? {} : input.status === "OVERDUE" ? { status: "OPEN" as const, dueDate: { lt: new Date() } } : { status: input.status }),
    ...(input.search
      ? {
          OR: [
            { description: { contains: input.search } },
            { partyName: { contains: input.search } },
            { sourceId: { contains: input.search } }
          ]
        }
      : {})
  };
}

export async function operationRoutes(app: FastifyInstance) {
  app.get("/api/v1/sales", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "sale.read");
    const query = parseQuery(saleListQuerySchema, request);
    const items = await prisma.sale.findMany({
      where: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        ...(query.source ? { source: query.source } : {}),
        ...(query.search ? { customer: { name: { contains: query.search } } } : {})
      },
      select: saleSelect,
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    const page = paginated(items, query.limit);
    const ifoodOrderIds = page.data.map(ifoodOrderIdFromSale).filter((value): value is string => Boolean(value));
    if (ifoodOrderIds.length === 0) {
      return page;
    }

    const events = await prisma.webhookEvent.findMany({
      where: {
        companyId: request.tenant!.companyId,
        channel: "IFOOD",
        status: "PROCESSED",
        OR: ifoodOrderIds.flatMap((orderId) => [{ payload: { path: "$.orderId", equals: orderId } }, { payload: { path: "$.metadata.id", equals: orderId } }])
      },
      select: { eventType: true, payload: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }
    });
    const displayByOrderId = new Map<string, string>();
    const eventTypeByOrderId = new Map<string, string>();
    const terminalEventTypeByOrderId = new Map<string, string>();
    for (const event of events) {
      const payload = recordValue(event.payload);
      const orderId = textValue(payload.orderId) ?? textValue(recordValue(payload.metadata).id);
      const displayId = textValue(payload.orderDisplayId);
      if (orderId && !eventTypeByOrderId.has(orderId)) {
        eventTypeByOrderId.set(orderId, event.eventType);
      }
      const terminalEventType = ifoodTerminalEventType(event.eventType);
      if (orderId && terminalEventType && !terminalEventTypeByOrderId.has(orderId)) {
        terminalEventTypeByOrderId.set(orderId, terminalEventType);
      }
      if (orderId && displayId && !displayByOrderId.has(orderId)) {
        displayByOrderId.set(orderId, displayId);
      }
    }

    return {
      ...page,
      data: page.data.map((sale) => {
        const orderId = ifoodOrderIdFromSale(sale);
        return orderId
          ? {
              ...sale,
              ifoodOrderId: orderId,
              ifoodDisplayId: displayByOrderId.get(orderId) ?? null,
              ifoodLastEventType: eventTypeByOrderId.get(orderId) ?? null,
              ifoodTerminalStatus: terminalEventTypeByOrderId.get(orderId) ?? null
            }
          : sale;
      })
    };
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

      const fullSale = await tx.sale.findUniqueOrThrow({ where: { id: created.id }, select: saleSelect });
      await createFinancialEntriesForSale(tx, {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        saleId: created.id,
        total: new Prisma.Decimal(fullSale.total),
        paymentsTotal: paymentTotal,
        customerName: fullSale.customer?.name ?? null,
        createdBy: request.tenant!.userId
      });
      return fullSale;
    });

    await audit(request, { action: "sale.create", entityType: "Sale", entityId: sale.id, after: sale });
    if (shouldSyncSaleSourceToIfood(sale.source)) {
      void syncIfoodInventoryAfterLocalSale({
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        productIds: sale.items.map((item) => item.product.id)
      }).catch((error) => {
        request.log.warn({ err: error, saleId: sale.id }, "ifood inventory sync after local sale failed");
      });
    }
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

      if (current.status === "RESERVED") {
        for (const item of current.items) {
          await releaseReservedStock(tx, {
            companyId: request.tenant!.companyId,
            branchId: request.tenant!.branchId,
            warehouseId: current.warehouseId,
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity)
          });
        }
      } else {
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
      }

      await tx.sale.update({
        where: { id: current.id },
        data: { status: "CANCELLED", cancelledBy: request.tenant!.userId, cancelledAt: new Date(), cancelReason: body.reason }
      });
      await tx.financialEntry.updateMany({
        where: { companyId: request.tenant!.companyId, branchId: request.tenant!.branchId, sourceType: "SALE", sourceId: current.id, status: "OPEN" },
        data: { status: "CANCELLED", cancelledAt: new Date() }
      });

      return tx.sale.findUniqueOrThrow({ where: { id: current.id }, select: saleSelect });
    });

    await audit(request, { action: "sale.cancel", entityType: "Sale", entityId: sale.id, after: sale });
    if (shouldSyncSaleSourceToIfood(sale.source)) {
      void syncIfoodInventoryAfterLocalSale({
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        productIds: sale.items.map((item) => item.product.id)
      }).catch((error) => {
        request.log.warn({ err: error, saleId: sale.id }, "ifood inventory sync after local sale cancel failed");
      });
    }
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

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
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
      await createFinancialEntriesForPurchase(tx, {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        purchaseId: created.id,
        total: new Prisma.Decimal(created.total),
        supplierName: created.supplier?.name ?? null,
        createdBy: request.tenant!.userId
      });
      return created;
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
    await prisma.financialEntry.updateMany({
      where: { companyId: request.tenant!.companyId, branchId: request.tenant!.branchId, sourceType: "PURCHASE", sourceId: existing.id, status: "OPEN" },
      data: { status: "CANCELLED", cancelledAt: new Date() }
    });

    await audit(request, { action: "purchase.cancel", entityType: "Purchase", entityId: purchase.id, before: existing, after: purchase });
    return purchase;
  });

  app.get("/api/v1/finance/:direction", { preHandler: [app.authenticateUser] }, async (request) => {
    const params = parseParams(financialDirectionParamsSchema, request);
    const query = parseQuery(financialEntryListQuerySchema, request);
    const direction = params.direction === "receivables" ? "RECEIVABLE" : "PAYABLE";
    assertPermission(request.tenant!, direction === "RECEIVABLE" ? "sale.read" : "purchase.read");

    const items = await prisma.financialEntry.findMany({
      where: financialWhere({
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        direction,
        status: query.status,
        ...(query.search ? { search: query.search } : {})
      }),
      select: financialEntrySelect,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      ...pagination(query)
    });

    return paginated(items, query.limit);
  });

  app.post("/api/v1/finance/entries/:id/settle", { preHandler: [app.authenticateUser] }, async (request) => {
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(settleFinancialEntryBodySchema, request);

    const current = await prisma.financialEntry.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, branchId: request.tenant!.branchId },
      select: { id: true, direction: true, status: true, amount: true }
    });
    if (!current) {
      throw errors.notFound("FINANCIAL_ENTRY_NOT_FOUND", "Conta financeira não encontrada.");
    }
    assertPermission(request.tenant!, current.direction === "RECEIVABLE" ? "sale.create" : "purchase.create");
    if (current.status === "CANCELLED") {
      throw errors.conflict("INVALID_FINANCIAL_STATUS", "Conta cancelada não pode ser baixada.");
    }

    const interestAmount = new Prisma.Decimal(body.interestAmount);
    const discountAmount = new Prisma.Decimal(body.discountAmount);
    const expectedAmount = new Prisma.Decimal(current.amount).plus(interestAmount).minus(discountAmount);
    if (expectedAmount.lessThan(0)) {
      throw errors.conflict("INVALID_FINANCIAL_TOTAL", "O desconto não pode ser maior que o valor da conta.");
    }
    const paidAmount = new Prisma.Decimal(body.paidAmount ?? expectedAmount.toFixed(2));
    if (!paidAmount.equals(expectedAmount)) {
      throw errors.conflict("INVALID_FINANCIAL_PAYMENT", "O valor pago precisa fechar com valor, juros e desconto.");
    }

    const entry = await prisma.financialEntry.update({
      where: { id: current.id },
      data: {
        status: "PAID",
        paidAmount,
        interestAmount,
        discountAmount,
        paymentMethod: body.paymentMethod ?? null,
        proofUrl: body.proofUrl ?? null,
        proofFileName: body.proofFileName ?? null,
        paidAt: new Date()
      },
      select: financialEntrySelect
    });
    await audit(request, { action: "financial_entry.settle", entityType: "FinancialEntry", entityId: entry.id, before: current, after: entry });
    return entry;
  });

  app.post("/api/v1/finance/entries/:id/cancel", { preHandler: [app.authenticateUser] }, async (request) => {
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(cancelFinancialEntryBodySchema, request);
    const current = await prisma.financialEntry.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, branchId: request.tenant!.branchId },
      select: { id: true, direction: true, status: true }
    });
    if (!current) {
      throw errors.notFound("FINANCIAL_ENTRY_NOT_FOUND", "Conta financeira não encontrada.");
    }
    assertPermission(request.tenant!, current.direction === "RECEIVABLE" ? "sale.cancel" : "purchase.create");
    if (current.status === "PAID") {
      throw errors.conflict("INVALID_FINANCIAL_STATUS", "Conta baixada não pode ser cancelada por este fluxo.");
    }
    const entry = await prisma.financialEntry.update({
      where: { id: current.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      select: financialEntrySelect
    });
    await audit(request, { action: "financial_entry.cancel", entityType: "FinancialEntry", entityId: entry.id, before: { ...current, reason: body.reason }, after: entry });
    return entry;
  });
}
