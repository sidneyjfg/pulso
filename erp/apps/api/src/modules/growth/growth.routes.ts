import type { FastifyBaseLogger, FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { config } from "@erp/config";
import {
  createAlertRuleBodySchema,
  createImportJobBodySchema,
  createIntegrationConnectionBodySchema,
  completeIfoodOauthBodySchema,
  connectIfoodIntegrationBodySchema,
  createProductFromIfoodItemBodySchema,
  createReportJobBodySchema,
  ifoodCatalogItemsQuerySchema,
  ifoodOrderActionBodySchema,
  ingestIfoodOrderEventsBodySchema,
  linkIfoodCatalogItemBodySchema,
  listQuerySchema,
  reprocessIfoodOrderEventsBodySchema,
  startIfoodOauthBodySchema,
  updateAlertRuleBodySchema,
  updateIntegrationConnectionBodySchema
} from "@erp/contracts";
import { Prisma, prisma } from "@erp/database";
import { AppError, assertPermission, errors } from "@erp/security";
import { randomUUID } from "node:crypto";
import { parseBody, parseParams, parseQuery } from "../../lib/zod.js";
import {
  acknowledgeIfoodOrderEvents,
  calculateIfoodInventoryAmount,
  confirmIfoodOrder,
  connectIfoodByAuthorizationCode,
  createIfoodCategory,
  getIfoodOrderDetails,
  healthCheckIfoodMerchant,
  listIfoodSellableItems,
  pollIfoodOrderEvents,
  publishSimpleIfoodItem,
  resolveIfoodAccessToken,
  startIfoodDeviceAuthorization,
  transitionIfoodOrder,
  updateIfoodInventory,
  uploadIfoodImage,
  type IfoodOrderApiEvent,
  type IfoodOrderDetails,
  type IfoodSellableItem
} from "./ifood.service.js";

const idParamsSchema = z.object({ id: z.string().cuid() });
const syncIfoodCatalogBodySchema = z.object({
  dryRun: z.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(5000).default(1000),
  productId: z.string().cuid().optional()
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

async function assertBranch(companyId: string, branchId: string | undefined) {
  if (!branchId) {
    return null;
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId, active: true },
    select: { id: true }
  });

  if (!branch) {
    throw errors.notFound("BRANCH_NOT_FOUND", "Loja não encontrada.");
  }

  return branch;
}

async function assertCategory(companyId: string, categoryId: string | undefined) {
  if (!categoryId) {
    return;
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, companyId, active: true },
    select: { id: true }
  });

  if (!category) {
    throw errors.notFound("CATEGORY_NOT_FOUND", "Categoria não encontrada.");
  }
}

type IfoodOrderEvent = {
  externalEventId: string;
  eventType: string;
  occurredAt?: Date;
  order: {
    externalOrderId: string;
    status: "PLACED" | "CONFIRMED" | "CONCLUDED" | "CANCELLED";
    warehouseId?: string;
    cancelReason?: string;
    customer?: {
      name?: string;
      document?: string;
      email?: string;
    };
    items: Array<{
      productId: string | null;
      ifoodItemId?: string;
      externalCode?: string;
      ean?: string;
      name?: string;
      quantity: string;
      unitPrice: string;
      discount: string;
    }>;
  };
};

type IfoodRawOrderEvent = IfoodOrderEvent | IfoodOrderApiEvent;

function isOfficialIfoodOrderEvent(event: IfoodRawOrderEvent): event is IfoodOrderApiEvent {
  return "id" in event && "code" in event && "orderId" in event;
}

function recordValue(input: unknown) {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

function textValue(input: unknown) {
  return typeof input === "string" && input.trim() ? input.trim() : null;
}

function numberValue(input: unknown) {
  const value = typeof input === "number" ? input : typeof input === "string" ? Number(input) : NaN;
  return Number.isFinite(value) ? value : null;
}

function moneyString(input: unknown, fallback = 0) {
  const value = numberValue(input) ?? fallback;
  return value.toFixed(2);
}

function quantityString(input: unknown) {
  const value = numberValue(input);
  if (!value || value <= 0) {
    throw errors.conflict("IFOOD_ORDER_ITEM_QUANTITY_INVALID", "Item do pedido iFood com quantidade inválida.");
  }
  return String(value);
}

function ifoodEventCode(event: IfoodRawOrderEvent) {
  return isOfficialIfoodOrderEvent(event) ? event.fullCode ?? event.code : event.eventType;
}

function normalizedIfoodEventId(event: IfoodRawOrderEvent) {
  return isOfficialIfoodOrderEvent(event) ? event.id : event.externalEventId;
}

function normalizedIfoodOrderId(event: IfoodRawOrderEvent) {
  return isOfficialIfoodOrderEvent(event) ? event.orderId : event.order.externalOrderId;
}

function ifoodOrderStatusFromCode(code: string): IfoodOrderEvent["order"]["status"] | null {
  const normalized = code.toUpperCase();
  if (normalized === "CAN") {
    return "CANCELLED";
  }
  if (normalized === "CON") {
    return "CONCLUDED";
  }
  if (normalized === "PLC") {
    return "PLACED";
  }
  if (normalized === "CFM") {
    return "CONFIRMED";
  }
  if (normalized.includes("CANCEL")) {
    return "CANCELLED";
  }
  if (normalized.includes("CONCLUDED")) {
    return "CONCLUDED";
  }
  if (normalized.includes("PLACED")) {
    return "PLACED";
  }
  if (normalized.includes("CONFIRMED")) {
    return "CONFIRMED";
  }
  return null;
}

function shouldFetchIfoodOrderDetails(event: IfoodRawOrderEvent) {
  const status = isOfficialIfoodOrderEvent(event) ? ifoodOrderStatusFromCode(ifoodEventCode(event)) : event.order.status;
  return status === "PLACED" || status === "CONFIRMED";
}

function shouldConfirmIfoodOrder(event: IfoodRawOrderEvent) {
  if (!isOfficialIfoodOrderEvent(event)) {
    return false;
  }
  const status = ifoodOrderStatusFromCode(ifoodEventCode(event));
  return status === "PLACED" || status === "CONFIRMED";
}

function ifoodCustomerFromDetails(details: IfoodOrderDetails | null): IfoodOrderEvent["order"]["customer"] {
  const customer = recordValue(details?.customer);
  const document = textValue(customer.document) ?? textValue(customer.taxPayerIdentificationNumber);
  return {
    ...(textValue(customer.name) ? { name: textValue(customer.name)! } : {}),
    ...(document && /^\d{11}$|^\d{14}$/.test(document) ? { document } : {}),
    ...(textValue(customer.email) ? { email: textValue(customer.email)! } : {})
  };
}

function ifoodOrderItemDiagnostics(details: IfoodOrderDetails | null) {
  const rawItems = Array.isArray(details?.items) ? details.items.map(recordValue) : [];
  return rawItems.map((item) => ({
    id: textValue(item.id),
    externalCode: textValue(item.externalCode),
    ean: textValue(item.ean),
    name: textValue(item.name),
    quantity: numberValue(item.quantity),
    unitPrice: numberValue(item.unitPrice),
    price: numberValue(item.price)
  }));
}

function ifoodOrderDisplayId(details: IfoodOrderDetails | null) {
  const record = recordValue(details);
  return textValue(record.displayId) ?? textValue(record.shortReference) ?? textValue(record.orderNumber) ?? textValue(record.sequence);
}

function ifoodSellableItemKey(item: IfoodSellableItem) {
  return item.itemId || item.itemExternalCode || item.itemEan || item.itemName || randomUUID();
}

function ifoodSellableItemPrice(item: IfoodSellableItem) {
  return numberValue(recordValue(item.itemPrice).value) ?? 0;
}

function ifoodSellableItemPayload(item: IfoodSellableItem) {
  return {
    ifoodItemId: item.itemId,
    ifoodProductId: item.itemId,
    ifoodCategoryId: item.categoryId ?? "",
    externalCode: item.itemExternalCode ?? "",
    ean: item.itemEan ?? "",
    name: item.itemName ?? "Item iFood",
    description: item.itemDescription ?? null,
    categoryName: item.categoryName ?? null,
    unit: item.itemUnit ?? "UN",
    price: ifoodSellableItemPrice(item),
    hasOptionGroups: Array.isArray(item.itemOptionGroups) && item.itemOptionGroups.length > 0,
    raw: item
  };
}

function findIfoodSellableItem(items: IfoodSellableItem[], itemId: string) {
  return items.find((item) => item.itemId === itemId);
}

function ifoodOrderLogItemToSellableItem(item: Record<string, unknown>): IfoodSellableItem | null {
  const itemId = textValue(item.id);
  const name = textValue(item.name);
  if (!itemId || !name) {
    return null;
  }
  const externalCode = textValue(item.externalCode);
  const ean = textValue(item.ean);
  return {
    itemId,
    itemName: name,
    itemPrice: { value: numberValue(item.unitPrice) ?? numberValue(item.price) ?? 0 },
    itemUnit: "UN",
    categoryName: "Pedido iFood",
    ...(externalCode ? { itemExternalCode: externalCode } : {}),
    ...(ean ? { itemEan: ean } : {})
  };
}

async function listIfoodOrderLogItems(input: { companyId: string; integrationConnectionId: string }) {
  const events = await prisma.webhookEvent.findMany({
    where: {
      companyId: input.companyId,
      integrationConnectionId: input.integrationConnectionId,
      channel: "IFOOD",
      status: "FAILED"
    },
    select: { payload: true },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const itemsByName = new Map<string, IfoodSellableItem>();

  for (const event of events) {
    const payload = recordValue(event.payload);
    const orderItems = Array.isArray(payload.orderItems) ? payload.orderItems.map(recordValue) : [];
    for (const orderItem of orderItems) {
      const item = ifoodOrderLogItemToSellableItem(orderItem);
      if (!item?.itemName) {
        continue;
      }
      const key = item.itemName.trim().toLowerCase();
      if (!itemsByName.has(key)) {
        itemsByName.set(key, item);
      }
    }
  }

  return [...itemsByName.values()];
}

async function listIfoodCatalogCandidateItems(input: { connection: { id: string; companyId: string; externalAccountId: string; accessToken: string | null; refreshToken: string | null; tokenExpiresAt: Date | null } }) {
  const token = await resolveIfoodAccessToken({
    accessToken: input.connection.accessToken,
    refreshToken: input.connection.refreshToken,
    tokenExpiresAt: input.connection.tokenExpiresAt
  });
  if (token.refreshed) {
    await prisma.integrationConnection.update({
      where: { id: input.connection.id },
      data: {
        accessToken: token.refreshed.accessToken,
        ...(token.refreshed.refreshToken ? { refreshToken: token.refreshed.refreshToken } : {}),
        tokenExpiresAt: token.refreshed.tokenExpiresAt
      }
    });
  }

  const [sellableItems, orderLogItems] = await Promise.all([
    listIfoodSellableItems({ accessToken: token.accessToken, merchantId: input.connection.externalAccountId }),
    listIfoodOrderLogItems({ companyId: input.connection.companyId, integrationConnectionId: input.connection.id })
  ]);
  const byId = new Map<string, IfoodSellableItem>();
  for (const item of [...sellableItems, ...orderLogItems]) {
    const key = item.itemId || item.itemExternalCode || item.itemName;
    if (key && !byId.has(key)) {
      byId.set(key, item);
    }
  }

  return [...byId.values()];
}

async function resolveIfoodOrderItems(
  tx: Prisma.TransactionClient,
  input: { companyId: string; integrationConnectionId: string; details: IfoodOrderDetails }
): Promise<IfoodOrderEvent["order"]["items"]> {
  const rawItems = Array.isArray(input.details.items) ? input.details.items.map(recordValue) : [];
  if (rawItems.length === 0) {
    throw errors.conflict("IFOOD_ORDER_WITHOUT_ITEMS", "Pedido iFood sem itens para processar.");
  }

  const externalCodes = rawItems.map((item) => textValue(item.externalCode)).filter((value): value is string => Boolean(value));
  const eans = rawItems.map((item) => textValue(item.ean)).filter((value): value is string => Boolean(value));
  const ifoodItemIds = rawItems.map((item) => textValue(item.id)).filter((value): value is string => Boolean(value));
  const names = rawItems.map((item) => textValue(item.name)).filter((value): value is string => Boolean(value));

  const products = await tx.product.findMany({
    where: {
      companyId: input.companyId,
      active: true,
      OR: [
        ...(externalCodes.length > 0 ? [{ sku: { in: externalCodes } }] : []),
        ...(eans.length > 0 ? [{ barcodes: { some: { barcode: { in: eans } } } }] : []),
        ...(names.length > 0 ? [{ name: { in: names } }] : []),
        ...(ifoodItemIds.length > 0
          ? [
              {
                ifoodCatalogItems: {
                  some: {
                    integrationConnectionId: input.integrationConnectionId,
                    OR: [{ ifoodItemId: { in: ifoodItemIds } }, { ifoodProductId: { in: ifoodItemIds } }]
                  }
                }
              }
            ]
          : [])
      ]
    },
    select: {
      id: true,
      sku: true,
      name: true,
      barcodes: { select: { barcode: true } },
      ifoodCatalogItems: {
        where: { integrationConnectionId: input.integrationConnectionId },
        select: { ifoodItemId: true, ifoodProductId: true }
      }
    }
  });

  const bySku = new Map(products.map((product) => [product.sku, product.id]));
  const byName = new Map(products.map((product) => [product.name.trim().toLowerCase(), product.id]));
  const byEan = new Map(products.flatMap((product) => product.barcodes.map((barcode) => [barcode.barcode, product.id] as const)));
  const byIfoodId = new Map(
    products.flatMap((product) =>
      product.ifoodCatalogItems.flatMap((item) => [
        [item.ifoodItemId, product.id] as const,
        [item.ifoodProductId, product.id] as const
      ])
    )
  );

  return rawItems.map((item) => {
    const externalCode = textValue(item.externalCode);
    const ean = textValue(item.ean);
    const ifoodItemId = textValue(item.id);
    const name = textValue(item.name);
    const productId =
      (externalCode ? bySku.get(externalCode) : null) ??
      (ean ? byEan.get(ean) : null) ??
      (ifoodItemId ? byIfoodId.get(ifoodItemId) : null) ??
      (name ? byName.get(name.toLowerCase()) : null);

    const quantity = quantityString(item.quantity);
    const unitPrice = numberValue(item.unitPrice) ?? (numberValue(item.price) ?? 0) / Number(quantity);
    return {
      productId: productId ?? null,
      ...(ifoodItemId ? { ifoodItemId } : {}),
      ...(externalCode ? { externalCode } : {}),
      ...(ean ? { ean } : {}),
      ...(name ? { name } : {}),
      quantity,
      unitPrice: moneyString(unitPrice),
      discount: moneyString(item.discount)
    };
  });
}

function lineTotal(quantity: string, unitValue: string, discount: string) {
  const subtotal = new Prisma.Decimal(quantity).times(new Prisma.Decimal(unitValue));
  const total = subtotal.minus(new Prisma.Decimal(discount));
  if (total.lessThan(0)) {
    throw errors.conflict("INVALID_TOTAL", "O desconto não pode ser maior que o valor do item.");
  }
  return total;
}

function operationTotals(items: Array<{ quantity: string; unitValue: string; discount: string }>) {
  return items.reduce((total, item) => total.plus(lineTotal(item.quantity, item.unitValue, item.discount)), new Prisma.Decimal(0));
}

function decimalFromUnknown(input: unknown) {
  const value = numberValue(input);
  return value === null ? null : new Prisma.Decimal(value);
}

function ifoodOrderTotalFromDetails(details: IfoodOrderDetails | null, fallback: Prisma.Decimal) {
  const total = recordValue(details?.total);
  const candidates = [
    details?.total,
    total.orderAmount,
    recordValue(total.orderAmount).value,
    recordValue(total.orderAmount).amount,
    total.value,
    total.amount,
    total.total,
    total.itemsPrice,
    recordValue(total.itemsPrice).value,
    recordValue(total.itemsPrice).amount,
    total.subTotal,
    total.subtotal
  ];

  for (const candidate of candidates) {
    const decimal = decimalFromUnknown(candidate);
    if (decimal?.greaterThan(0)) {
      return decimal;
    }
  }

  return fallback;
}

function paymentMethodFromIfood(input: unknown): "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "BANK_TRANSFER" | "VOUCHER" | "OTHER" {
  const normalized = String(input ?? "").trim().toUpperCase();
  if (normalized.includes("PIX")) {
    return "PIX";
  }
  if (normalized.includes("CREDIT") || normalized.includes("CREDITO") || normalized.includes("CRÉDITO")) {
    return "CREDIT_CARD";
  }
  if (normalized.includes("DEBIT") || normalized.includes("DEBITO") || normalized.includes("DÉBITO")) {
    return "DEBIT_CARD";
  }
  if (normalized.includes("CASH") || normalized.includes("DINHEIRO")) {
    return "CASH";
  }
  if (normalized.includes("VOUCHER") || normalized.includes("MEAL") || normalized.includes("FOOD") || normalized.includes("VALE")) {
    return "VOUCHER";
  }
  if (normalized.includes("TRANSFER") || normalized.includes("BANK")) {
    return "BANK_TRANSFER";
  }
  return "OTHER";
}

function ifoodPaymentCandidates(details: IfoodOrderDetails | null) {
  const payment = recordValue(details?.payment);
  const payments = recordValue(details?.payments);
  const candidates: Record<string, unknown>[] = [];
  for (const value of [payment, payments]) {
    if (Array.isArray(value)) {
      candidates.push(...value.map(recordValue));
      continue;
    }

    const nestedCandidates: Record<string, unknown>[] = [];
    if (Array.isArray(value.methods)) {
      nestedCandidates.push(...value.methods.map(recordValue));
    }
    if (Array.isArray(value.payments)) {
      nestedCandidates.push(...value.payments.map(recordValue));
    }

    if (nestedCandidates.length > 0) {
      candidates.push(...nestedCandidates);
      continue;
    }

    if (Object.keys(value).length > 0) {
      candidates.push(value);
    }
  }
  return candidates;
}

function ifoodPaymentsFromDetails(details: IfoodOrderDetails | null, fallbackAmount: Prisma.Decimal) {
  const candidates = ifoodPaymentCandidates(details);
  const payments = candidates
    .map((payment) => {
      const methodLabel =
        textValue(payment.method) ??
        textValue(payment.type) ??
        textValue(payment.name) ??
        textValue(payment.brand) ??
        textValue(payment.cardBrand) ??
        textValue(payment.walletName);
      const amount = numberValue(payment.value) ?? numberValue(payment.amount) ?? numberValue(payment.total) ?? numberValue(recordValue(payment.cash).value);
      return {
        method: paymentMethodFromIfood(methodLabel),
        amount: new Prisma.Decimal(amount ?? 0)
      };
    })
    .filter((payment) => payment.amount.greaterThan(0));

  if (payments.length > 0) {
    return payments;
  }

  return [{ method: "OTHER" as const, amount: fallbackAmount }];
}

function ifoodPaymentDiagnostics(details: IfoodOrderDetails | null, fallbackAmount: Prisma.Decimal) {
  return ifoodPaymentsFromDetails(details, fallbackAmount).map((payment) => ({
    method: payment.method,
    amount: payment.amount.toString()
  }));
}

async function assertProducts(companyId: string, productIds: string[]) {
  const uniqueProductIds = [...new Set(productIds)];
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds }, companyId, active: true },
    select: { id: true }
  });

  if (products.length !== uniqueProductIds.length) {
    throw errors.notFound("PRODUCT_NOT_FOUND", "Um ou mais produtos do pedido iFood não foram encontrados.");
  }
}

async function resolveIfoodPendingProductId(tx: Prisma.TransactionClient, companyId: string) {
  const sku = "__IFOOD_PENDING_ITEM__";
  const existing = await tx.product.findFirst({
    where: { companyId, sku },
    select: { id: true }
  });
  if (existing) {
    return existing.id;
  }

  const created = await tx.product.create({
    data: {
      companyId,
      sku,
      name: "Item iFood pendente de vínculo",
      description: "Produto técnico usado temporariamente quando um pedido iFood chega antes do vínculo com produto ERP.",
      unit: "UN",
      salePrice: new Prisma.Decimal(0),
      active: false
    },
    select: { id: true }
  });

  return created.id;
}

async function findOrCreateCustomer(
  tx: Prisma.TransactionClient,
  companyId: string,
  customer: IfoodOrderEvent["order"]["customer"]
) {
  if (!customer || (!customer.document && !customer.email && !customer.name)) {
    return null;
  }

  const existing = await tx.customer.findFirst({
    where: {
      companyId,
      OR: [
        ...(customer.document ? [{ document: customer.document }] : []),
        ...(customer.email ? [{ email: customer.email }] : [])
      ]
    },
    select: { id: true }
  });

  if (existing) {
    return existing.id;
  }

  if (!customer.name) {
    return null;
  }

  const created = await tx.customer.create({
    data: {
      companyId,
      name: customer.name,
      type: customer.document?.length === 14 ? "COMPANY" : "INDIVIDUAL",
      ...(customer.document ? { document: customer.document } : {}),
      ...(customer.email ? { email: customer.email } : {})
    },
    select: { id: true }
  });

  return created.id;
}

async function resolveWarehouseId(
  tx: Prisma.TransactionClient,
  input: { companyId: string; branchId: string; requestedWarehouseId: string | undefined }
) {
  if (input.requestedWarehouseId) {
    const warehouse = await tx.warehouse.findFirst({
      where: {
        id: input.requestedWarehouseId,
        companyId: input.companyId,
        branchId: input.branchId,
        active: true
      },
      select: { id: true }
    });
    if (!warehouse) {
      throw errors.notFound("WAREHOUSE_NOT_FOUND", "Depósito do pedido iFood não encontrado.");
    }
    return warehouse.id;
  }

  const fallback = await tx.warehouse.findFirst({
    where: { companyId: input.companyId, branchId: input.branchId, active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });

  if (!fallback) {
    throw errors.notFound("WAREHOUSE_NOT_FOUND", "Cadastre um depósito ativo para processar pedidos iFood.");
  }

  return fallback.id;
}

async function changeStock(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    branchId: string;
    warehouseId: string;
    productId: string;
    delta: Prisma.Decimal;
    movementType: "SALE" | "CANCEL_SALE";
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
    select: { id: true }
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
    throw errors.conflict("INSUFFICIENT_STOCK", "Estoque insuficiente para processar pedido iFood.");
  }

  const updated = await tx.stockBalance.updateMany({
    where: {
      id: balance.id,
      ...(input.delta.lessThan(0) ? { quantity: { gte: input.delta.abs() } } : {})
    },
    data: { quantity: { increment: input.delta } }
  });

  if (updated.count !== 1) {
    throw errors.conflict("INSUFFICIENT_STOCK", "Estoque insuficiente para processar pedido iFood.");
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
    select: { id: true }
  });
}

async function ensureStockBalance(
  tx: Prisma.TransactionClient,
  input: { companyId: string; branchId: string; warehouseId: string; productId: string }
) {
  return tx.stockBalance.upsert({
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
}

async function reserveStock(
  tx: Prisma.TransactionClient,
  input: { companyId: string; branchId: string; warehouseId: string; productId: string; quantity: Prisma.Decimal }
) {
  const balance = await ensureStockBalance(tx, input);
  const updated = await tx.$executeRaw`
    UPDATE StockBalance
    SET reservedQuantity = reservedQuantity + ${input.quantity}
    WHERE id = ${balance.id}
      AND quantity - reservedQuantity >= ${input.quantity}
  `;

  if (updated !== 1) {
    const [product, currentBalance] = await Promise.all([
      tx.product.findFirst({
        where: { id: input.productId, companyId: input.companyId },
        select: { name: true, sku: true }
      }),
      tx.stockBalance.findUnique({
        where: { id: balance.id },
        select: { quantity: true, reservedQuantity: true }
      })
    ]);
    const available = currentBalance
      ? new Prisma.Decimal(currentBalance.quantity).minus(new Prisma.Decimal(currentBalance.reservedQuantity))
      : new Prisma.Decimal(0);
    throw errors.conflict(
      "INSUFFICIENT_STOCK",
      `Estoque insuficiente para reservar pedido iFood: ${product?.name ?? input.productId}${product?.sku ? ` (SKU ${product.sku})` : ""}. Necessário ${input.quantity.toString()}, disponível ${available.toString()}.`
    );
  }
}

async function releaseReservedStock(
  tx: Prisma.TransactionClient,
  input: { companyId: string; branchId: string; warehouseId: string; productId: string; quantity: Prisma.Decimal }
) {
  const balance = await ensureStockBalance(tx, input);
  await tx.$executeRaw`
    UPDATE StockBalance
    SET reservedQuantity = GREATEST(reservedQuantity - ${input.quantity}, 0)
    WHERE id = ${balance.id}
  `;
}

async function commitReservedStock(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    branchId: string;
    warehouseId: string;
    productId: string;
    quantity: Prisma.Decimal;
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
    select: { id: true }
  });

  if (existingMovement) {
    return existingMovement;
  }

  const balance = await ensureStockBalance(tx, input);
  const rows = await tx.$queryRaw<Array<{ quantity: Prisma.Decimal; reservedQuantity: Prisma.Decimal }>>`
    SELECT quantity, reservedQuantity
    FROM StockBalance
    WHERE id = ${balance.id}
    FOR UPDATE
  `;
  const currentBalance = rows[0];
  if (!currentBalance) {
    throw errors.notFound("STOCK_BALANCE_NOT_FOUND", "Saldo de estoque não encontrado.");
  }

  const previous = new Prisma.Decimal(currentBalance.quantity);
  const reserved = new Prisma.Decimal(currentBalance.reservedQuantity);
  if (reserved.lessThan(input.quantity) || previous.lessThan(input.quantity)) {
    throw errors.conflict("INSUFFICIENT_STOCK", "Estoque reservado insuficiente para finalizar pedido iFood.");
  }

  await tx.$executeRaw`
    UPDATE StockBalance
    SET reservedQuantity = reservedQuantity - ${input.quantity},
        quantity = quantity - ${input.quantity}
    WHERE id = ${balance.id}
  `;

  const current = previous.minus(input.quantity);
  return tx.stockMovement.create({
    data: {
      companyId: input.companyId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      productId: input.productId,
      type: "SALE",
      quantity: input.quantity.negated(),
      previousQuantity: previous,
      currentQuantity: current,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      reason: input.reason,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey
    },
    select: { id: true }
  });
}

async function reserveIfoodSaleItems(
  tx: Prisma.TransactionClient,
  input: { companyId: string; branchId: string; warehouseId: string; saleId: string; items: Array<{ productId: string; quantity: Prisma.Decimal }> }
) {
  for (const item of input.items) {
    await reserveStock(tx, {
      companyId: input.companyId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      productId: item.productId,
      quantity: new Prisma.Decimal(item.quantity)
    });
  }
}

async function releaseIfoodSaleReservation(
  tx: Prisma.TransactionClient,
  input: { companyId: string; branchId: string; warehouseId: string; items: Array<{ productId: string; quantity: Prisma.Decimal }> }
) {
  for (const item of input.items) {
    await releaseReservedStock(tx, {
      companyId: input.companyId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      productId: item.productId,
      quantity: new Prisma.Decimal(item.quantity)
    });
  }
}

async function finalizeIfoodReservedSale(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    branchId: string;
    warehouseId: string;
    saleId: string;
    items: Array<{ productId: string; quantity: Prisma.Decimal }>;
    userId: string;
  }
) {
  for (const [index, item] of input.items.entries()) {
    await commitReservedStock(tx, {
      companyId: input.companyId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      productId: item.productId,
      quantity: new Prisma.Decimal(item.quantity),
      reason: "Venda iFood",
      userId: input.userId,
      idempotencyKey: `ifood:sale:${input.saleId}:finalize:${index}:${item.productId}`,
      referenceType: "Sale",
      referenceId: input.saleId
    });
  }

  return tx.sale.update({
    where: { id: input.saleId },
    data: { status: "COMPLETED" },
    select: { id: true }
  });
}

async function resolveIfoodPendingItem(
  tx: Prisma.TransactionClient,
  input: { companyId: string; branchId: string; pendingItemId: string; productId: string; userId: string }
) {
  const pending = await tx.ifoodOrderPendingItem.findFirst({
    where: { id: input.pendingItemId, companyId: input.companyId, branchId: input.branchId, status: "PENDING_LINK" },
    select: {
      id: true,
      saleId: true,
      saleItemId: true,
      integrationConnectionId: true,
      ifoodOrderId: true,
      quantity: true,
      name: true,
      sale: { select: { id: true, status: true, warehouseId: true } }
    }
  });
  if (!pending) {
    throw errors.notFound("IFOOD_PENDING_ITEM_NOT_FOUND", "Pendência iFood não encontrada.");
  }
  if (pending.sale.status === "CANCELLED" || pending.sale.status === "COMPLETED") {
    throw errors.conflict("IFOOD_PENDING_SALE_CLOSED", "Pedido iFood já está encerrado.");
  }

  const product = await tx.product.findFirst({
    where: { id: input.productId, companyId: input.companyId, active: true },
    select: { id: true }
  });
  if (!product) {
    throw errors.notFound("PRODUCT_NOT_FOUND", "Produto não encontrado para resolver pendência.");
  }

  await reserveStock(tx, {
    companyId: input.companyId,
    branchId: input.branchId,
    warehouseId: pending.sale.warehouseId,
    productId: product.id,
    quantity: new Prisma.Decimal(pending.quantity)
  });
  await tx.saleItem.update({
    where: { id: pending.saleItemId },
    data: { productId: product.id }
  });
  await tx.ifoodOrderPendingItem.update({
    where: { id: pending.id },
    data: { status: "RESOLVED", resolvedProductId: product.id, resolvedAt: new Date(), lastError: null }
  });
  const remaining = await tx.ifoodOrderPendingItem.count({
    where: { saleId: pending.saleId, status: "PENDING_LINK" }
  });
  if (remaining === 0 && pending.sale.status === "PENDING") {
    const processedConclusion = await tx.webhookEvent.findFirst({
      where: {
        companyId: input.companyId,
        integrationConnectionId: pending.integrationConnectionId,
        channel: "IFOOD",
        status: "PROCESSED",
        eventType: "CONCLUDED"
      },
      select: { payload: true },
      orderBy: { updatedAt: "desc" }
    });
    const conclusionPayload = recordValue(processedConclusion?.payload);
    const hasProcessedConclusion =
      textValue(conclusionPayload.orderId) === pending.ifoodOrderId ||
      textValue(recordValue(conclusionPayload.metadata).id) === pending.ifoodOrderId;

    if (hasProcessedConclusion) {
      const saleItems = await tx.saleItem.findMany({
        where: { saleId: pending.saleId },
        select: { productId: true, quantity: true }
      });
      await finalizeIfoodReservedSale(tx, {
        companyId: input.companyId,
        branchId: input.branchId,
        warehouseId: pending.sale.warehouseId,
        saleId: pending.saleId,
        items: saleItems,
        userId: input.userId
      });
    } else {
      await tx.sale.update({
        where: { id: pending.saleId },
        data: { status: "RESERVED" }
      });
    }
  }

  return { saleId: pending.saleId, pendingItemId: pending.id, remaining };
}

async function processIfoodEvent(
  tx: Prisma.TransactionClient,
  input: {
    connection: { id: string; companyId: string; branchId: string | null };
    tenant: { branchId: string; userId: string };
    event: IfoodRawOrderEvent;
    orderDetails?: IfoodOrderDetails | null;
  }
) {
  const eventCode = ifoodEventCode(input.event);
  const eventStatus = isOfficialIfoodOrderEvent(input.event) ? ifoodOrderStatusFromCode(eventCode) : input.event.order.status;
  if (!eventStatus) {
    return { action: "ignored", saleId: null };
  }

  const branchId = input.connection.branchId ?? input.tenant.branchId;
  const order = isOfficialIfoodOrderEvent(input.event)
    ? {
        externalOrderId: input.event.orderId,
        status: eventStatus,
        warehouseId: undefined,
        customer: ifoodCustomerFromDetails(input.orderDetails ?? null),
        items:
          eventStatus === "PLACED" || eventStatus === "CONFIRMED"
            ? await resolveIfoodOrderItems(tx, {
                companyId: input.connection.companyId,
                integrationConnectionId: input.connection.id,
                details: input.orderDetails ?? (() => {
                  throw errors.conflict("IFOOD_ORDER_DETAILS_REQUIRED", "Detalhes do pedido iFood são obrigatórios para processar o pedido.");
                })()
              })
            : [],
        cancelReason: textValue(recordValue(input.event.metadata).cancelReason) ?? textValue(recordValue(input.event.metadata).cancelReasonDescription) ?? undefined
      }
    : input.event.order;
  const saleIdempotencyKey = `ifood:order:${input.connection.id}:${order.externalOrderId}`;
  const isCancelEvent = order.status === "CANCELLED" || eventCode.toLowerCase().includes("cancel");

  if (isCancelEvent) {
    const currentSale = await tx.sale.findFirst({
      where: {
        companyId: input.connection.companyId,
        branchId,
        idempotencyKey: saleIdempotencyKey
      },
      select: {
        id: true,
        status: true,
        warehouseId: true,
        items: { select: { productId: true, quantity: true } }
      }
    });

    if (!currentSale) {
      return { action: "cancel_missing", saleId: null };
    }

    if (currentSale.status === "CANCELLED") {
      return { action: "cancel_skipped", saleId: currentSale.id };
    }

    if (currentSale.status === "RESERVED" || currentSale.status === "PENDING") {
      await releaseIfoodSaleReservation(tx, {
        companyId: input.connection.companyId,
        branchId,
        warehouseId: currentSale.warehouseId,
        items: currentSale.items
      });
    } else {
      for (const [index, item] of currentSale.items.entries()) {
        await changeStock(tx, {
          companyId: input.connection.companyId,
          branchId,
          warehouseId: currentSale.warehouseId,
          productId: item.productId,
          delta: new Prisma.Decimal(item.quantity),
          movementType: "CANCEL_SALE",
          reason: order.cancelReason ?? "Cancelado no iFood",
          userId: input.tenant.userId,
          idempotencyKey: `ifood:event:${input.event.externalEventId}:cancel:${index}:${item.productId}`,
          referenceType: "Sale",
          referenceId: currentSale.id
        });
      }
    }

    const cancelled = await tx.sale.update({
      where: { id: currentSale.id },
      data: {
        status: "CANCELLED",
        cancelledBy: input.tenant.userId,
        cancelledAt: new Date(),
        cancelReason: order.cancelReason ?? "Cancelado no iFood"
      },
      select: { id: true }
    });

    return { action: "cancelled", saleId: cancelled.id };
  }

  const existingSale = await tx.sale.findFirst({
    where: { companyId: input.connection.companyId, branchId, idempotencyKey: saleIdempotencyKey },
    select: {
      id: true,
      status: true,
      warehouseId: true,
      items: { select: { productId: true, quantity: true } }
    }
  });
  if (existingSale) {
    if (order.status === "CONCLUDED" && existingSale.status === "RESERVED") {
      const finalized = await finalizeIfoodReservedSale(tx, {
        companyId: input.connection.companyId,
        branchId,
        warehouseId: existingSale.warehouseId,
        saleId: existingSale.id,
        items: existingSale.items,
        userId: input.tenant.userId
      });
      return { action: "finalized", saleId: finalized.id };
    }

    if (order.status === "CONCLUDED") {
      return { action: existingSale.status === "COMPLETED" ? "already_finalized" : "concluded_skipped", saleId: existingSale.id };
    }

    return {
      action: existingSale.status === "RESERVED" ? "already_reserved" : "already_created",
      saleId: existingSale.id,
      confirmOrderId: (existingSale.status === "RESERVED" || existingSale.status === "PENDING") && shouldConfirmIfoodOrder(input.event) ? order.externalOrderId : null
    };
  }

  if (order.status === "CONCLUDED") {
    return { action: "concluded_missing", saleId: null };
  }

  if (order.status !== "PLACED" && order.status !== "CONFIRMED") {
    return { action: "ignored", saleId: null };
  }

  const processedTerminalEvents = await tx.webhookEvent.findMany({
    where: {
      companyId: input.connection.companyId,
      integrationConnectionId: input.connection.id,
      channel: "IFOOD",
      status: "PROCESSED",
      eventType: { in: ["CANCELLED", "CONCLUDED"] }
    },
    select: { payload: true },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const hasProcessedTerminalEvent = processedTerminalEvents.some((event) => {
    const payload = recordValue(event.payload);
    return textValue(payload.orderId) === order.externalOrderId || textValue(recordValue(payload.metadata).id) === order.externalOrderId;
  });
  if (hasProcessedTerminalEvent) {
    return { action: "terminal_skipped", saleId: null };
  }

  const resolvedProductIds = order.items.map((item) => item.productId).filter((productId): productId is string => Boolean(productId));
  await assertProducts(input.connection.companyId, resolvedProductIds);
  const warehouseId = await resolveWarehouseId(tx, {
    companyId: input.connection.companyId,
    branchId,
    requestedWarehouseId: order.warehouseId
  });
  const pendingProductId = order.items.some((item) => !item.productId)
    ? await resolveIfoodPendingProductId(tx, input.connection.companyId)
    : null;
  const customerId = await findOrCreateCustomer(tx, input.connection.companyId, order.customer);
  const itemsSubtotal = operationTotals(order.items.map((item) => ({ quantity: item.quantity, unitValue: item.unitPrice, discount: item.discount })));
  const orderTotal = ifoodOrderTotalFromDetails(input.orderDetails ?? null, itemsSubtotal);
  const payments = ifoodPaymentsFromDetails(input.orderDetails ?? null, orderTotal);

  const created = await tx.sale.create({
    data: {
      companyId: input.connection.companyId,
      branchId,
      warehouseId,
      ...(customerId ? { customerId } : {}),
      status: pendingProductId ? "PENDING" : "RESERVED",
      subtotal: orderTotal,
      discount: new Prisma.Decimal(0),
      total: orderTotal,
      source: "IFOOD",
      createdBy: input.tenant.userId,
      idempotencyKey: saleIdempotencyKey,
      payments: {
        create: payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount
        }))
      }
    },
    select: { id: true }
  });
  const createdItems: Array<{ id: string; productId: string; quantity: Prisma.Decimal }> = [];
  for (const item of order.items) {
    const saleItem = await tx.saleItem.create({
      data: {
        saleId: created.id,
        productId: item.productId ?? pendingProductId!,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        discount: new Prisma.Decimal(item.discount),
        total: lineTotal(item.quantity, item.unitPrice, item.discount)
      },
      select: { id: true, productId: true, quantity: true }
    });
    createdItems.push(saleItem);
    if (!item.productId) {
      await tx.ifoodOrderPendingItem.create({
        data: {
          companyId: input.connection.companyId,
          branchId,
          integrationConnectionId: input.connection.id,
          saleId: created.id,
          saleItemId: saleItem.id,
          ifoodOrderId: order.externalOrderId,
          ifoodItemId: item.ifoodItemId ?? item.externalCode ?? item.name ?? saleItem.id,
          externalCode: item.externalCode ?? null,
          ean: item.ean ?? null,
          name: item.name ?? "Item iFood",
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          status: "PENDING_LINK"
        }
      });
    }
  }

  if (!pendingProductId) {
    await reserveIfoodSaleItems(tx, {
      companyId: input.connection.companyId,
      branchId,
      warehouseId,
      saleId: created.id,
      items: createdItems
    });
  } else if (createdItems.some((item) => item.productId !== pendingProductId)) {
    await reserveIfoodSaleItems(tx, {
      companyId: input.connection.companyId,
      branchId,
      warehouseId,
      saleId: created.id,
      items: createdItems.filter((item) => item.productId !== pendingProductId)
    });
  }

  return { action: pendingProductId ? "pending" : "reserved", saleId: created.id, confirmOrderId: shouldConfirmIfoodOrder(input.event) ? order.externalOrderId : null };
}

type IfoodOrderConnection = {
  id: string;
  companyId: string;
  branchId: string | null;
  externalAccountId: string | null;
  status: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  createdBy: string;
};

type IfoodOrderIngestSummary = {
  received: number;
  processed: number;
  duplicates: number;
  failed: number;
  createdSales: number;
  reservedSales: number;
  finalizedSales: number;
  cancelledSales: number;
  ackedEventIds: string[];
  errors: Array<{ externalEventId: string; message: string }>;
};

function emptyIfoodOrderIngestSummary(): IfoodOrderIngestSummary {
  return {
    received: 0,
    processed: 0,
    duplicates: 0,
    failed: 0,
    createdSales: 0,
    reservedSales: 0,
    finalizedSales: 0,
    cancelledSales: 0,
    ackedEventIds: [],
    errors: []
  };
}

async function ingestIfoodOrderEvents(input: {
  connection: IfoodOrderConnection;
  tenant: { branchId: string; userId: string };
  events: IfoodRawOrderEvent[];
  acknowledge: boolean;
}) {
  if (input.connection.status !== "CONNECTED") {
    throw errors.conflict("INTEGRATION_NOT_CONNECTED", "Conecte o canal iFood antes de processar pedidos.");
  }

  const summary = emptyIfoodOrderIngestSummary();
  const hasOfficialEvents = input.events.some(isOfficialIfoodOrderEvent);
  const officialAckEventIds: string[] = [];
  let orderApiAccessToken: string | null = null;

  if (hasOfficialEvents) {
    const token = await resolveIfoodAccessToken({
      accessToken: input.connection.accessToken,
      refreshToken: input.connection.refreshToken,
      tokenExpiresAt: input.connection.tokenExpiresAt
    });
    orderApiAccessToken = token.accessToken;
    if (token.refreshed) {
      await prisma.integrationConnection.update({
        where: { id: input.connection.id },
        data: {
          accessToken: token.refreshed.accessToken,
          ...(token.refreshed.refreshToken ? { refreshToken: token.refreshed.refreshToken } : {}),
          tokenExpiresAt: token.refreshed.tokenExpiresAt
        }
      });
      input.connection.accessToken = token.refreshed.accessToken;
      input.connection.refreshToken = token.refreshed.refreshToken ?? input.connection.refreshToken;
      input.connection.tokenExpiresAt = token.refreshed.tokenExpiresAt;
    }
  }

  for (const event of input.events) {
    summary.received += 1;
    const externalEventId = normalizedIfoodEventId(event);
    const eventType = ifoodEventCode(event);
    const existing = await prisma.webhookEvent.findUnique({
      where: { channel_externalEventId: { channel: "IFOOD", externalEventId } },
      select: { id: true, status: true }
    });

    if (existing?.status === "PROCESSED" || existing?.status === "DUPLICATE") {
      await prisma.webhookEvent.update({
        where: { id: existing.id },
        data: { status: "DUPLICATE", attempts: { increment: 1 } }
      });
      summary.duplicates += 1;
      if (input.acknowledge) {
        if (isOfficialIfoodOrderEvent(event)) {
          officialAckEventIds.push(externalEventId);
        } else {
          summary.ackedEventIds.push(externalEventId);
        }
      }
      continue;
    }

    const webhook = await prisma.webhookEvent.upsert({
      where: { channel_externalEventId: { channel: "IFOOD", externalEventId } },
      create: {
        companyId: input.connection.companyId,
        integrationConnectionId: input.connection.id,
        channel: "IFOOD",
        externalEventId,
        eventType,
        payload: event as Prisma.InputJsonValue,
        status: "RECEIVED"
      },
      update: {
        eventType,
        payload: event as Prisma.InputJsonValue,
        status: "RECEIVED"
      },
      select: { id: true }
    });

    let orderDetails: IfoodOrderDetails | null = null;
    try {
      await prisma.webhookEvent.update({
        where: { id: webhook.id },
        data: { status: "PROCESSING", attempts: { increment: 1 } }
      });

      orderDetails =
        isOfficialIfoodOrderEvent(event) && shouldFetchIfoodOrderDetails(event)
          ? await getIfoodOrderDetails({ accessToken: orderApiAccessToken!, orderId: normalizedIfoodOrderId(event) })
          : null;
      const result = await prisma.$transaction((tx) =>
        processIfoodEvent(tx, {
          connection: input.connection,
          tenant: input.tenant,
          event,
          orderDetails
        })
      );

      if (result.confirmOrderId && orderApiAccessToken) {
        await confirmIfoodOrder({ accessToken: orderApiAccessToken, orderId: result.confirmOrderId });
      }

      await prisma.webhookEvent.update({
        where: { id: webhook.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          payload: {
            ...(event as Record<string, unknown>),
            orderDisplayId: ifoodOrderDisplayId(orderDetails),
            orderItems: ifoodOrderItemDiagnostics(orderDetails),
            paymentMethods: ifoodPaymentDiagnostics(orderDetails, new Prisma.Decimal(0))
          } as Prisma.InputJsonValue
        }
      });

      if (result.action === "reserved") {
        summary.reservedSales += 1;
      } else if (result.action === "finalized" || result.action === "created") {
        summary.finalizedSales += 1;
        summary.createdSales += 1;
      } else if (result.action === "cancelled") {
        summary.cancelledSales += 1;
      }

      summary.processed += 1;
      if (input.acknowledge) {
        if (isOfficialIfoodOrderEvent(event)) {
          officialAckEventIds.push(externalEventId);
        } else {
          summary.ackedEventIds.push(externalEventId);
        }
      }
    } catch (error) {
      summary.failed += 1;
      const waitingForDetails = error instanceof AppError && error.code === "IFOOD_ORDER_DETAILS_NOT_AVAILABLE";
      const message = waitingForDetails
        ? "Aguardando detalhes completos do pedido no iFood. O ERP vai tentar novamente no próximo polling antes de criar a venda."
        : error instanceof Error ? error.message : "Falha ao processar evento iFood.";
      summary.errors.push({ externalEventId, message });

      await prisma.webhookEvent.update({
        where: { id: webhook.id },
        data: {
          status: "FAILED",
          payload: {
            ...(event as Record<string, unknown>),
            processingError: message,
            orderDisplayId: ifoodOrderDisplayId(orderDetails),
            orderItems: ifoodOrderItemDiagnostics(orderDetails),
            paymentMethods: ifoodPaymentDiagnostics(orderDetails, new Prisma.Decimal(0))
          } as Prisma.InputJsonValue
        }
      });
    }
  }

  if (input.acknowledge && orderApiAccessToken && officialAckEventIds.length > 0) {
    const uniqueAckEventIds = [...new Set(officialAckEventIds)];
    await acknowledgeIfoodOrderEvents({ accessToken: orderApiAccessToken, eventIds: uniqueAckEventIds });
    summary.ackedEventIds.push(...uniqueAckEventIds);
  }

  await prisma.integrationConnection.update({
    where: { id: input.connection.id },
    data: { lastSyncAt: new Date() }
  });

  return summary;
}

async function pollIfoodOrderConnection(input: { connection: IfoodOrderConnection; limit?: number }) {
  if (input.connection.status !== "CONNECTED") {
    throw errors.conflict("INTEGRATION_NOT_CONNECTED", "Conecte o canal iFood antes de buscar pedidos.");
  }
  if (!input.connection.branchId) {
    return { ...emptyIfoodOrderIngestSummary(), skipped: true, reason: "Conexão iFood sem loja vinculada." };
  }
  if (!input.connection.externalAccountId) {
    return { ...emptyIfoodOrderIngestSummary(), skipped: true, reason: "Conexão iFood sem merchant configurado." };
  }

  const token = await resolveIfoodAccessToken({
    accessToken: input.connection.accessToken,
    refreshToken: input.connection.refreshToken,
    tokenExpiresAt: input.connection.tokenExpiresAt
  });
  if (token.refreshed) {
    await prisma.integrationConnection.update({
      where: { id: input.connection.id },
      data: {
        accessToken: token.refreshed.accessToken,
        ...(token.refreshed.refreshToken ? { refreshToken: token.refreshed.refreshToken } : {}),
        tokenExpiresAt: token.refreshed.tokenExpiresAt
      }
    });
    input.connection.accessToken = token.refreshed.accessToken;
    input.connection.refreshToken = token.refreshed.refreshToken ?? input.connection.refreshToken;
    input.connection.tokenExpiresAt = token.refreshed.tokenExpiresAt;
  }

  const polled = await pollIfoodOrderEvents({
    accessToken: token.accessToken,
    merchantId: input.connection.externalAccountId
  });
  const events = polled.events.slice(0, input.limit ?? 100) as IfoodRawOrderEvent[];

  if (events.length === 0) {
    await prisma.integrationConnection.update({
      where: { id: input.connection.id },
      data: { lastSyncAt: new Date() }
    });
    return { ...emptyIfoodOrderIngestSummary(), skipped: false };
  }

  return {
    ...(await ingestIfoodOrderEvents({
      connection: input.connection,
      tenant: { branchId: input.connection.branchId, userId: input.connection.createdBy },
      events,
      acknowledge: true
    })),
    skipped: false
  };
}

export async function pollConnectedIfoodOrdersOnce(input: { logger?: FastifyBaseLogger; limit?: number } = {}) {
  if (!config.IFOOD_ENABLED) {
    return { connections: 0, received: 0, processed: 0, failed: 0, skipped: 0 };
  }

  const connections = await prisma.integrationConnection.findMany({
    where: {
      channel: "IFOOD",
      status: "CONNECTED",
      externalAccountId: { not: null },
      accessToken: { not: null },
      refreshToken: { not: null },
      branchId: { not: null }
    },
    select: {
      id: true,
      companyId: true,
      branchId: true,
      externalAccountId: true,
      status: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      createdBy: true
    },
    take: config.IFOOD_ORDER_POLLING_CONNECTION_LIMIT ?? 25,
    orderBy: { updatedAt: "asc" }
  });

  const total = { connections: connections.length, received: 0, processed: 0, failed: 0, skipped: 0 };
  for (const connection of connections) {
    try {
      const result = await pollIfoodOrderConnection({
        connection,
        ...(input.limit !== undefined ? { limit: input.limit } : {})
      });
      total.received += result.received;
      total.processed += result.processed;
      total.failed += result.failed;
      if (result.skipped) {
        total.skipped += 1;
      }
    } catch (error) {
      total.failed += 1;
      input.logger?.warn({ err: error, connectionId: connection.id }, "ifood order polling failed");
    }
  }

  return total;
}

function startIfoodOrderPolling(app: FastifyInstance) {
  if (!config.IFOOD_ENABLED || config.IFOOD_ORDER_POLLING_ENABLED === false) {
    return null;
  }

  let running = false;
  const poll = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      const result = await pollConnectedIfoodOrdersOnce({ logger: app.log });
      if (result.received > 0 || result.failed > 0) {
        app.log.info(result, "ifood order polling completed");
      }
    } catch (error) {
      app.log.warn({ err: error }, "ifood order polling cycle failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void poll(), config.IFOOD_ORDER_POLLING_INTERVAL_MS ?? 30000);
  timer.unref();
  void poll();
  return timer;
}

export async function growthRoutes(app: FastifyInstance) {
  let ifoodOrderPollingTimer: NodeJS.Timeout | null = null;

  app.addHook("onReady", async () => {
    ifoodOrderPollingTimer = startIfoodOrderPolling(app);
  });

  app.addHook("onClose", async () => {
    if (ifoodOrderPollingTimer) {
      clearInterval(ifoodOrderPollingTimer);
    }
  });

  app.get("/api/v1/alerts", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.read");
    const query = parseQuery(listQuerySchema, request);
    const dueUntil = new Date();
    dueUntil.setDate(dueUntil.getDate() + 3);
    const [items, financialEntries, ifoodSales] = await Promise.all([
      prisma.alert.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }],
        ...(query.search
          ? {
              OR: [
                { branchId: request.tenant!.branchId, title: { contains: query.search } },
                { branchId: request.tenant!.branchId, message: { contains: query.search } },
                { branchId: null, title: { contains: query.search } },
                { branchId: null, message: { contains: query.search } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        title: true,
        message: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        resolvedAt: true
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
      }),
      prisma.financialEntry.findMany({
        where: {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          status: "OPEN",
          dueDate: { lte: dueUntil },
          ...(query.search ? { OR: [{ description: { contains: query.search } }, { partyName: { contains: query.search } }] } : {})
        },
        select: {
          id: true,
          direction: true,
          description: true,
          partyName: true,
          dueDate: true,
          amount: true,
          createdAt: true
        },
        orderBy: { dueDate: "asc" },
        take: 10
      }),
      prisma.sale.findMany({
        where: {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          source: "IFOOD",
          status: { in: ["PENDING", "RESERVED"] },
          ...(query.search ? { customer: { name: { contains: query.search } } } : {})
        },
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          customer: { select: { name: true } },
          items: { select: { product: { select: { name: true } } }, take: 2 }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);
    const dynamicAlerts = [
      ...ifoodSales.map((sale) => ({
        id: `ifood-order:${sale.id}`,
        type: "IFOOD_ORDER",
        severity: "WARNING",
        status: "OPEN",
        title: "Pedido iFood recebido",
        message: `${sale.customer?.name ?? "Cliente iFood"} · ${sale.items.map((item) => item.product.name).join(", ") || "Itens do pedido"} · R$ ${new Prisma.Decimal(sale.total).toFixed(2)}`,
        entityType: "Sale",
        entityId: sale.id,
        targetTab: "ifood-orders",
        targetId: sale.id,
        createdAt: sale.createdAt,
        resolvedAt: null
      })),
      ...financialEntries.map((entry) => ({
        id: `financial:${entry.id}`,
        type: "FINANCIAL_DUE",
        severity: entry.dueDate < new Date() ? "CRITICAL" : "WARNING",
        status: "OPEN",
        title: entry.direction === "RECEIVABLE" ? "Conta a receber próxima do vencimento" : "Conta a pagar próxima do vencimento",
        message: `${entry.partyName ?? entry.description} · R$ ${new Prisma.Decimal(entry.amount).toFixed(2)} · vence em ${entry.dueDate.toLocaleDateString("pt-BR")}`,
        entityType: "FinancialEntry",
        entityId: entry.id,
        targetTab: entry.direction === "RECEIVABLE" ? "receivables" : "payables",
        targetId: entry.id,
        createdAt: entry.createdAt,
        resolvedAt: null
      })),
      ...items.map((item) => ({
        ...item,
        targetTab:
          item.entityType === "Sale"
            ? "sales-history"
            : item.entityType === "Purchase"
              ? "purchases"
              : item.entityType === "FinancialEntry"
                ? "receivables"
                : item.entityType === "IfoodOrder"
                  ? "ifood-orders"
                  : "alerts",
        targetId: item.entityId ?? item.id
      }))
    ];
    return { data: dynamicAlerts.slice(0, query.limit), nextCursor: null };
  });

  app.get("/api/v1/alerts/rules", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.alertRule.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }],
        ...(query.search ? { name: { contains: query.search } } : {})
      },
      select: { id: true, type: true, name: true, active: true, threshold: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/alerts/rules", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "inventory.adjust");
    const body = parseBody(createAlertRuleBodySchema, request);
    await assertBranch(request.tenant!.companyId, body.branchId);

    const rule = await prisma.alertRule.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: body.branchId ?? request.tenant!.branchId,
        type: body.type,
        name: body.name,
        ...(body.threshold !== undefined ? { threshold: body.threshold as Prisma.InputJsonValue } : {}),
        createdBy: request.tenant!.userId
      },
      select: { id: true, type: true, name: true, active: true, threshold: true, createdAt: true }
    });

    await audit(request, { action: "alert_rule.create", entityType: "AlertRule", entityId: rule.id, after: rule });
    return reply.status(201).send(rule);
  });

  app.patch("/api/v1/alerts/rules/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.adjust");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateAlertRuleBodySchema, request);
    await assertBranch(request.tenant!.companyId, body.branchId);

    const before = await prisma.alertRule.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true, type: true, name: true, active: true, threshold: true, branchId: true }
    });

    if (!before) {
      throw errors.notFound("ALERT_RULE_NOT_FOUND", "Regra de alerta não encontrada.");
    }

    const rule = await prisma.alertRule.update({
      where: { id: before.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.branchId !== undefined ? { branchId: body.branchId } : {}),
        ...(body.threshold !== undefined ? { threshold: body.threshold as Prisma.InputJsonValue } : {})
      },
      select: { id: true, type: true, name: true, active: true, threshold: true, createdAt: true, updatedAt: true }
    });

    await audit(request, { action: "alert_rule.update", entityType: "AlertRule", entityId: rule.id, before, after: rule });
    return rule;
  });

  app.get("/api/v1/imports/jobs", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "product.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.importJob.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }],
        ...(query.search ? { fileName: { contains: query.search } } : {})
      },
      select: { id: true, source: true, status: true, fileName: true, totalRows: true, validRows: true, invalidRows: true, summary: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/imports/jobs", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "product.create");
    const body = parseBody(createImportJobBodySchema, request);
    await assertBranch(request.tenant!.companyId, body.branchId);

    const job = await prisma.importJob.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: body.branchId ?? request.tenant!.branchId,
        source: body.source,
        fileName: body.fileName ?? null,
        createdBy: request.tenant!.userId
      },
      select: { id: true, source: true, status: true, fileName: true, totalRows: true, validRows: true, invalidRows: true, createdAt: true }
    });

    await audit(request, { action: "import_job.create", entityType: "ImportJob", entityId: job.id, after: job });
    return reply.status(201).send(job);
  });

  app.get("/api/v1/integrations/connections", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.integrationConnection.findMany({
      where: {
        companyId: request.tenant!.companyId,
        channel: "IFOOD",
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }],
        ...(query.search ? { externalAccountId: { contains: query.search } } : {})
      },
      select: {
        id: true,
        channel: true,
        status: true,
        externalAccountId: true,
        ecommerceStockMode: true,
        ecommerceStockPercent: true,
        ecommerceStockFixedQuantity: true,
        connectedAt: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/integrations/connections", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "integration.manage");
    const body = parseBody(createIntegrationConnectionBodySchema, request);
    if (body.channel !== "IFOOD") {
      throw errors.conflict("ONLY_IFOOD_SUPPORTED", "Esta implementação aceita somente conexões do canal iFood.");
    }
    await assertBranch(request.tenant!.companyId, body.branchId);
    const branchId = body.branchId ?? request.tenant!.branchId;
    const existingConnection = await prisma.integrationConnection.findFirst({
      where: {
        companyId: request.tenant!.companyId,
        branchId,
        channel: body.channel
      },
      select: { id: true }
    });

    if (existingConnection) {
      throw errors.conflict("IFOOD_CONNECTION_ALREADY_EXISTS", "Esta loja ja possui uma conexao iFood. Abra o fluxo existente para continuar.");
    }

    const connection = await prisma.integrationConnection.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId,
        channel: body.channel,
        externalAccountId: body.externalAccountId ?? null,
        createdBy: request.tenant!.userId
      },
      select: { id: true, channel: true, status: true, externalAccountId: true, ecommerceStockMode: true, ecommerceStockPercent: true, ecommerceStockFixedQuantity: true, connectedAt: true, lastSyncAt: true, createdAt: true }
    });

    await audit(request, { action: "integration_connection.create", entityType: "IntegrationConnection", entityId: connection.id, after: connection });
    return reply.status(201).send(connection);
  });

  app.patch("/api/v1/integrations/connections/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateIntegrationConnectionBodySchema, request);
    const before = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true, channel: true, status: true, externalAccountId: true, ecommerceStockMode: true, ecommerceStockPercent: true, ecommerceStockFixedQuantity: true }
    });

    if (!before) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão não encontrada.");
    }

    const connection = await prisma.integrationConnection.update({
      where: { id: before.id },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.externalAccountId !== undefined ? { externalAccountId: body.externalAccountId } : {}),
        ...(body.ecommerceStockMode !== undefined ? { ecommerceStockMode: body.ecommerceStockMode } : {}),
        ...(body.ecommerceStockPercent !== undefined ? { ecommerceStockPercent: body.ecommerceStockPercent === null ? null : new Prisma.Decimal(body.ecommerceStockPercent) } : {}),
        ...(body.ecommerceStockFixedQuantity !== undefined ? { ecommerceStockFixedQuantity: body.ecommerceStockFixedQuantity === null ? null : new Prisma.Decimal(body.ecommerceStockFixedQuantity) } : {}),
        ...(body.status === "CONNECTED" ? { connectedAt: new Date() } : {})
      },
      select: { id: true, channel: true, status: true, externalAccountId: true, ecommerceStockMode: true, ecommerceStockPercent: true, ecommerceStockFixedQuantity: true, connectedAt: true, lastSyncAt: true, updatedAt: true }
    });

    await audit(request, { action: "integration_connection.update", entityType: "IntegrationConnection", entityId: connection.id, before, after: connection });
    return connection;
  });

  app.post("/api/v1/integrations/connections/:id/ifood/oauth/start", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(startIfoodOauthBodySchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true, channel: true, status: true, externalAccountId: true }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }

    const start = await startIfoodDeviceAuthorization();
    await audit(request, {
      action: "integration_connection.ifood_oauth_start",
      entityType: "IntegrationConnection",
      entityId: connection.id,
      after: { mode: body.mode, userCode: start.userCode }
    });

    return {
      ...start,
      mode: body.mode
    };
  });

  app.post("/api/v1/integrations/connections/:id/ifood/oauth/complete", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(completeIfoodOauthBodySchema, request);
    const before = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true, channel: true, status: true, externalAccountId: true }
    });

    if (!before) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }

    const auth = await connectIfoodByAuthorizationCode({
      authorizationCode: body.authorizationCode,
      authorizationCodeVerifier: body.authorizationCodeVerifier,
      ...(body.merchantId ? { merchantId: body.merchantId } : {})
    });

    const connection = await prisma.integrationConnection.update({
      where: { id: before.id },
      data: {
        status: "CONNECTED",
        externalAccountId: auth.merchant.id,
        accessToken: auth.credentials.accessToken,
        ...(auth.credentials.refreshToken ? { refreshToken: auth.credentials.refreshToken } : {}),
        tokenExpiresAt: auth.credentials.tokenExpiresAt,
        connectedAt: new Date(),
        lastSyncAt: new Date()
      },
      select: { id: true, channel: true, status: true, externalAccountId: true, connectedAt: true, lastSyncAt: true, updatedAt: true }
    });

    await audit(request, {
      action: "integration_connection.ifood_oauth_complete",
      entityType: "IntegrationConnection",
      entityId: connection.id,
      before,
      after: { ...connection, mode: body.mode, merchant: auth.merchant }
    });

    return {
      connection,
      merchant: auth.merchant,
      merchants: auth.merchants,
      mode: body.mode
    };
  });

  app.post("/api/v1/integrations/connections/:id/ifood/connect", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(connectIfoodIntegrationBodySchema, request);
    const before = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true, channel: true, status: true, externalAccountId: true }
    });

    if (!before) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão não encontrada.");
    }

    if (before.channel !== "IFOOD") {
      throw errors.conflict("INVALID_INTEGRATION_CHANNEL", "Esta conexão não é do canal iFood.");
    }

    void body;
    throw errors.conflict("IFOOD_DISTRIBUTED_OAUTH_REQUIRED", "Use Conectar iFood para autorizar a loja pelo Portal iFood.");
  });

  app.get("/api/v1/integrations/connections/:id/ifood/health", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.read");
    const params = parseParams(idParamsSchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: {
        id: true,
        channel: true,
        status: true,
        externalAccountId: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        ecommerceStockMode: true,
        ecommerceStockPercent: true,
        ecommerceStockFixedQuantity: true,
        connectedAt: true,
        lastSyncAt: true
      }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão não encontrada.");
    }

    if (connection.channel !== "IFOOD") {
      throw errors.conflict("INVALID_INTEGRATION_CHANNEL", "Esta conexão não é do canal iFood.");
    }

    if (!connection.externalAccountId) {
      throw errors.conflict("IFOOD_MERCHANT_NOT_CONFIGURED", "Defina o merchant iFood antes de testar a saúde da conexão.");
    }

    const token = await resolveIfoodAccessToken({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      tokenExpiresAt: connection.tokenExpiresAt
    });
    const health = await healthCheckIfoodMerchant(connection.externalAccountId, token.accessToken);
    const updated = await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        ...(token.refreshed
          ? {
              accessToken: token.refreshed.accessToken,
              ...(token.refreshed.refreshToken ? { refreshToken: token.refreshed.refreshToken } : {}),
              tokenExpiresAt: token.refreshed.tokenExpiresAt
            }
          : {})
      },
      select: { id: true, channel: true, status: true, externalAccountId: true, connectedAt: true, lastSyncAt: true, updatedAt: true }
    });

    return {
      status: "healthy",
      merchant: health.merchant,
      connection: updated
    };
  });

  app.get("/api/v1/integrations/connections/:id/ifood/catalog/items", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.read");
    const params = parseParams(idParamsSchema, request);
    const query = parseQuery(ifoodCatalogItemsQuerySchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        status: true,
        externalAccountId: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true
      }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }
    if (connection.status !== "CONNECTED" || !connection.externalAccountId) {
      throw errors.conflict("IFOOD_CONNECTION_REQUIRED", "Conecte o iFood antes de listar o catálogo.");
    }

    const sellableItems = await listIfoodCatalogCandidateItems({ connection: { ...connection, externalAccountId: connection.externalAccountId } });
    const mappedItems = await prisma.ifoodCatalogItem.findMany({
      where: { companyId: request.tenant!.companyId, integrationConnectionId: connection.id },
      select: {
        ifoodItemId: true,
        ifoodProductId: true,
        externalCode: true,
        product: { select: { id: true, name: true, sku: true } },
        status: true,
        lastSyncedAt: true,
        lastError: true
      }
    });
    const byIfoodItemId = new Map(mappedItems.map((item) => [item.ifoodItemId, item]));
    const byExternalCode = new Map(mappedItems.filter((item) => item.externalCode).map((item) => [item.externalCode, item]));
    const search = query.search?.toLowerCase();
    const items = sellableItems
      .map((item) => {
        const mapped = byIfoodItemId.get(item.itemId) ?? (item.itemExternalCode ? byExternalCode.get(item.itemExternalCode) : null);
        return {
          id: ifoodSellableItemKey(item),
          ...ifoodSellableItemPayload(item),
          linked: Boolean(mapped),
          mappedProduct: mapped?.product ?? null,
          mappingStatus: mapped?.status ?? null,
          lastSyncedAt: mapped?.lastSyncedAt ?? null,
          lastError: mapped?.lastError ?? null
        };
      })
      .filter((item) => (query.status === "linked" ? item.linked : query.status === "unlinked" ? !item.linked : true))
      .filter((item) => {
        if (!search) {
          return true;
        }
        return [item.name, item.externalCode, item.ean, item.categoryName, item.mappedProduct?.name, item.mappedProduct?.sku]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });

    return {
      data: items.slice(0, query.limit),
      nextCursor: null,
      summary: {
        total: sellableItems.length,
        linked: items.filter((item) => item.linked).length,
        unlinked: items.filter((item) => !item.linked).length
      }
    };
  });

  app.post("/api/v1/integrations/connections/:id/ifood/catalog/items/:ifoodItemId/link", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema.extend({ ifoodItemId: z.string().trim().min(1).max(180) }), request);
    const body = parseBody(linkIfoodCatalogItemBodySchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true, companyId: true, branchId: true, status: true, externalAccountId: true, accessToken: true, refreshToken: true, tokenExpiresAt: true }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }
    if (connection.status !== "CONNECTED" || !connection.externalAccountId) {
      throw errors.conflict("IFOOD_CONNECTION_REQUIRED", "Conecte o iFood antes de vincular itens.");
    }

    const product = await prisma.product.findFirst({
      where: { id: body.productId, companyId: request.tenant!.companyId, active: true },
      select: { id: true, sku: true, name: true }
    });
    if (!product) {
      throw errors.notFound("PRODUCT_NOT_FOUND", "Produto não encontrado para vincular ao iFood.");
    }
    const existingProductMapping = await prisma.ifoodCatalogItem.findUnique({
      where: {
        integrationConnectionId_productId: {
          integrationConnectionId: connection.id,
          productId: product.id
        }
      },
      select: { ifoodItemId: true }
    });
    if (existingProductMapping && existingProductMapping.ifoodItemId !== params.ifoodItemId) {
      throw errors.conflict("IFOOD_PRODUCT_ALREADY_LINKED", "Este produto ERP já está vinculado a outro item iFood nesta loja.");
    }

    const sellableItems = await listIfoodCatalogCandidateItems({ connection: { ...connection, externalAccountId: connection.externalAccountId } });
    const item = findIfoodSellableItem(sellableItems, params.ifoodItemId);
    if (!item) {
      throw errors.notFound("IFOOD_ITEM_NOT_FOUND", "Item iFood não encontrado no catálogo atual.");
    }
    const payload = ifoodSellableItemPayload(item);
    const mapping = await prisma.ifoodCatalogItem.upsert({
      where: {
        integrationConnectionId_ifoodItemId: {
          integrationConnectionId: connection.id,
          ifoodItemId: payload.ifoodItemId
        }
      },
      create: {
        companyId: request.tenant!.companyId,
        branchId: connection.branchId ?? request.tenant!.branchId,
        integrationConnectionId: connection.id,
        productId: product.id,
        ifoodCategoryId: payload.ifoodCategoryId,
        ifoodItemId: payload.ifoodItemId,
        ifoodProductId: payload.ifoodProductId,
        externalCode: payload.externalCode || product.sku,
        status: "SYNCED",
        lastSyncedAt: new Date(),
        lastError: null
      },
      update: {
        productId: product.id,
        ifoodCategoryId: payload.ifoodCategoryId,
        ifoodProductId: payload.ifoodProductId,
        externalCode: payload.externalCode || product.sku,
        status: "SYNCED",
        lastSyncedAt: new Date(),
        lastError: null
      },
      select: { id: true, ifoodItemId: true, externalCode: true, product: { select: { id: true, name: true, sku: true } } }
    });

    await audit(request, {
      action: "integration_connection.ifood_catalog_item_link",
      entityType: "IfoodCatalogItem",
      entityId: mapping.id,
      after: { ifoodItem: payload, product: mapping.product }
    });

    return mapping;
  });

  app.post("/api/v1/integrations/connections/:id/ifood/catalog/items/:ifoodItemId/create-product", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "product.create");
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema.extend({ ifoodItemId: z.string().trim().min(1).max(180) }), request);
    const body = parseBody(createProductFromIfoodItemBodySchema, request);
    await assertCategory(request.tenant!.companyId, body.categoryId);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true, companyId: true, branchId: true, status: true, externalAccountId: true, accessToken: true, refreshToken: true, tokenExpiresAt: true }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }
    if (connection.status !== "CONNECTED" || !connection.externalAccountId) {
      throw errors.conflict("IFOOD_CONNECTION_REQUIRED", "Conecte o iFood antes de criar produtos.");
    }

    const sellableItems = await listIfoodCatalogCandidateItems({ connection: { ...connection, externalAccountId: connection.externalAccountId } });
    const item = findIfoodSellableItem(sellableItems, params.ifoodItemId);
    if (!item) {
      throw errors.notFound("IFOOD_ITEM_NOT_FOUND", "Item iFood não encontrado no catálogo atual.");
    }
    const payload = ifoodSellableItemPayload(item);
    const existingMapping = await prisma.ifoodCatalogItem.findUnique({
      where: {
        integrationConnectionId_ifoodItemId: {
          integrationConnectionId: connection.id,
          ifoodItemId: payload.ifoodItemId
        }
      },
      select: { id: true }
    });
    if (existingMapping) {
      throw errors.conflict("IFOOD_ITEM_ALREADY_LINKED", "Este item iFood já está vinculado. Use Vincular produto para alterar o vínculo.");
    }
    const sku = body.sku ?? (payload.externalCode || payload.ifoodItemId);
    const salePrice = body.salePrice ?? new Prisma.Decimal(payload.price).toFixed(2);
    const barcode = body.barcode ?? (payload.ean || undefined);

    const existingProduct = await prisma.product.findFirst({
      where: { companyId: request.tenant!.companyId, sku },
      select: { id: true }
    });
    if (existingProduct) {
      throw errors.conflict("PRODUCT_SKU_ALREADY_EXISTS", "Já existe produto no ERP com este SKU. Use Vincular produto.");
    }
    if (barcode) {
      const existingBarcode = await prisma.productBarcode.findFirst({
        where: { companyId: request.tenant!.companyId, barcode },
        select: { id: true }
      });
      if (existingBarcode) {
        throw errors.conflict("PRODUCT_BARCODE_ALREADY_EXISTS", "Já existe produto no ERP com este código de barras. Use Vincular produto.");
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          companyId: request.tenant!.companyId,
          sku,
          name: body.name ?? payload.name,
          description: body.description ?? payload.description,
          categoryId: body.categoryId ?? null,
          unit: body.unit,
          ...(body.costPrice ? { costPrice: new Prisma.Decimal(body.costPrice) } : {}),
          salePrice: new Prisma.Decimal(salePrice),
          ...(barcode
            ? {
                barcodes: {
                  create: {
                    companyId: request.tenant!.companyId,
                    barcode
                  }
                }
              }
            : {})
        },
        select: { id: true, sku: true, name: true, salePrice: true }
      });
      const mapping = await tx.ifoodCatalogItem.create({
        data: {
          companyId: request.tenant!.companyId,
          branchId: connection.branchId ?? request.tenant!.branchId,
          integrationConnectionId: connection.id,
          productId: product.id,
          ifoodCategoryId: payload.ifoodCategoryId,
          ifoodItemId: payload.ifoodItemId,
          ifoodProductId: payload.ifoodProductId,
          externalCode: payload.externalCode || product.sku,
          status: "SYNCED",
          lastSyncedAt: new Date()
        },
        select: { id: true, ifoodItemId: true, externalCode: true }
      });
      return { product, mapping };
    });

    await audit(request, {
      action: "integration_connection.ifood_catalog_item_create_product",
      entityType: "Product",
      entityId: created.product.id,
      after: { product: created.product, mapping: created.mapping, ifoodItem: payload }
    });

    return reply.status(201).send(created);
  });

  app.post("/api/v1/integrations/connections/:id/ifood/catalog/sync", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(syncIfoodCatalogBodySchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        status: true,
        externalAccountId: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        ecommerceStockMode: true,
        ecommerceStockPercent: true,
        ecommerceStockFixedQuantity: true
      }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }

    if (connection.status === "DISCONNECTED" || connection.status === "PAUSED") {
      throw errors.conflict("INTEGRATION_NOT_CONNECTED", "Conecte o iFood antes de sincronizar catálogo.");
    }

    if (!connection.externalAccountId) {
      throw errors.conflict("IFOOD_MERCHANT_NOT_CONFIGURED", "Merchant iFood não configurado para esta conexão.");
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

    const branchId = connection.branchId ?? request.tenant!.branchId;
    const products = await prisma.product.findMany({
      where: {
        companyId: connection.companyId,
        active: true,
        ...(body.productId ? { id: body.productId } : {})
      },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        imageDataUrl: true,
        ifoodImagePath: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
        salePrice: true,
        active: true,
        barcodes: { select: { barcode: true }, take: 1 },
        branchPrices: {
          where: { branchId },
          select: { salePrice: true },
          take: 1
        },
        ifoodCatalogItems: {
          where: { integrationConnectionId: connection.id },
          select: { ifoodItemId: true, ifoodProductId: true },
          take: 1
        }
      },
      orderBy: { createdAt: "asc" },
      take: body.limit
    });

    const balances = await prisma.stockBalance.groupBy({
      by: ["productId"],
      where: { companyId: connection.companyId, branchId },
      _sum: { quantity: true, reservedQuantity: true }
    });
    const balanceByProductId = new Map(
      balances.map((item) => [
        item.productId,
        (item._sum.quantity ?? new Prisma.Decimal(0)).minus(item._sum.reservedQuantity ?? new Prisma.Decimal(0))
      ])
    );

    if (body.productId && products.length === 0) {
      throw errors.notFound("PRODUCT_NOT_FOUND", "Produto não encontrado para sincronizar com iFood.");
    }

    const result = [];

    for (const product of products) {
      const issues: string[] = [];
      const salePrice = product.branchPrices[0]?.salePrice ?? product.salePrice;
      if (product.barcodes.length === 0) {
        issues.push("Produto sem código de barras.");
      }
      if (!product.categoryId || !product.category) {
        issues.push("Produto sem categoria.");
      }
      if (new Prisma.Decimal(salePrice).lessThanOrEqualTo(0)) {
        issues.push("Preço de venda inválido.");
      }

      let status = issues.length === 0 ? "READY" : "ERROR";
      let ifoodItemId = product.ifoodCatalogItems[0]?.ifoodItemId ?? null;
      const stockQuantity = balanceByProductId.get(product.id) ?? new Prisma.Decimal(0);
      const ifoodInventoryAmount = calculateIfoodInventoryAmount(stockQuantity, connection);

      if (!body.dryRun && issues.length === 0 && product.categoryId && product.category) {
        try {
          let categoryMap = await prisma.ifoodCatalogCategory.findUnique({
            where: {
              integrationConnectionId_categoryId: {
                integrationConnectionId: connection.id,
                categoryId: product.categoryId
              }
            },
            select: { id: true, ifoodCategoryId: true }
          });

          if (!categoryMap) {
            const category = await createIfoodCategory({
              accessToken: token.accessToken,
              merchantId: connection.externalAccountId,
              name: product.category.name
            });
            categoryMap = await prisma.ifoodCatalogCategory.create({
              data: {
                companyId: connection.companyId,
                integrationConnectionId: connection.id,
                categoryId: product.categoryId,
                ifoodCategoryId: category.id,
                name: product.category.name,
                lastSyncedAt: new Date()
              },
              select: { id: true, ifoodCategoryId: true }
            });
          }

          const existingMapping = product.ifoodCatalogItems[0];
          const itemId = existingMapping?.ifoodItemId ?? randomUUID();
          const ifoodProductId = existingMapping?.ifoodProductId ?? randomUUID();
          const externalCode = product.sku;
          let imagePath = product.ifoodImagePath;

          if (product.imageDataUrl && !imagePath) {
            const image = await uploadIfoodImage({
              accessToken: token.accessToken,
              merchantId: connection.externalAccountId,
              imageDataUrl: product.imageDataUrl
            });
            imagePath = image.imagePath;
            await prisma.product.update({
              where: { id: product.id },
              data: { ifoodImagePath: imagePath }
            });
          }

          await publishSimpleIfoodItem({
            accessToken: token.accessToken,
            merchantId: connection.externalAccountId,
            item: {
              id: itemId,
              productId: ifoodProductId,
              categoryId: categoryMap.ifoodCategoryId,
              externalCode,
              name: product.name,
              description: product.description,
              imagePath,
              price: Number(new Prisma.Decimal(salePrice).toFixed(2)),
              status: product.active ? "AVAILABLE" : "UNAVAILABLE"
            }
          });

          await updateIfoodInventory({
            accessToken: token.accessToken,
            merchantId: connection.externalAccountId,
            productId: ifoodProductId,
            amount: ifoodInventoryAmount
          });

          await prisma.ifoodCatalogItem.upsert({
            where: {
              integrationConnectionId_productId: {
                integrationConnectionId: connection.id,
                productId: product.id
              }
            },
            create: {
              companyId: connection.companyId,
              branchId,
              integrationConnectionId: connection.id,
              productId: product.id,
              ifoodCategoryId: categoryMap.ifoodCategoryId,
              ifoodItemId: itemId,
              ifoodProductId,
              externalCode,
              status: "SYNCED",
              lastSyncedAt: new Date(),
              lastError: null
            },
            update: {
              ifoodCategoryId: categoryMap.ifoodCategoryId,
              ifoodItemId: itemId,
              ifoodProductId,
              externalCode,
              status: "SYNCED",
              lastSyncedAt: new Date(),
              lastError: null
            }
          });

          status = "SYNCED";
          ifoodItemId = itemId;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha ao publicar produto no iFood.";
          status = "ERROR";
          issues.push(message);
          await prisma.ifoodCatalogItem.upsert({
            where: {
              integrationConnectionId_productId: {
                integrationConnectionId: connection.id,
                productId: product.id
              }
            },
            create: {
              companyId: connection.companyId,
              branchId,
              integrationConnectionId: connection.id,
              productId: product.id,
              ifoodCategoryId: "",
              ifoodItemId: randomUUID(),
              ifoodProductId: randomUUID(),
              externalCode: product.sku,
              status: "ERROR",
              lastError: message
            },
            update: {
              status: "ERROR",
              lastError: message
            }
          });
        }
      }

      result.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        barcode: product.barcodes[0]?.barcode ?? null,
        salePrice: salePrice.toString(),
        stock: stockQuantity.toString(),
        status,
        ifoodItemId,
        issues
      });
    }

    const summary = {
      total: result.length,
      synced: result.filter((item) => item.status === "SYNCED").length,
      errors: result.filter((item) => item.status === "ERROR").length,
      dryRun: body.dryRun
    };

    if (!body.dryRun) {
      await prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          status: "CONNECTED"
        }
      });
    }

    await audit(request, {
      action: "integration_connection.ifood_catalog_sync",
      entityType: "IntegrationConnection",
      entityId: connection.id,
      after: summary
    });

    return {
      summary,
      items: result
    };
  });

  app.get("/api/v1/integrations/connections/:id/ifood/events", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.read");
    const params = parseParams(idParamsSchema, request);
    const query = parseQuery(listQuerySchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }

    const items = await prisma.webhookEvent.findMany({
      where: {
        companyId: request.tenant!.companyId,
        integrationConnectionId: connection.id,
        channel: "IFOOD",
        ...(query.search ? { OR: [{ externalEventId: { contains: query.search } }, { eventType: { contains: query.search } }] } : {})
      },
      select: {
        id: true,
        externalEventId: true,
        eventType: true,
        payload: true,
        status: true,
        attempts: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });

    return paginated(items, query.limit);
  });

  app.post("/api/v1/integrations/connections/:id/ifood/events", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(ingestIfoodOrderEventsBodySchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        externalAccountId: true,
        status: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        createdBy: true
      }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }

    const summary = await ingestIfoodOrderEvents({
      connection,
      tenant: { branchId: request.tenant!.branchId, userId: request.tenant!.userId },
      events: body.events as IfoodRawOrderEvent[],
      acknowledge: body.acknowledge
    });

    await audit(request, {
      action: "integration_connection.ifood_orders_ingest",
      entityType: "IntegrationConnection",
      entityId: connection.id,
      after: summary
    });

    return summary;
  });

  app.post("/api/v1/integrations/connections/:id/ifood/events/poll", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        externalAccountId: true,
        status: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        createdBy: true
      }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }

    const summary = await pollIfoodOrderConnection({ connection, limit: 100 });
    await audit(request, {
      action: "integration_connection.ifood_orders_poll",
      entityType: "IntegrationConnection",
      entityId: connection.id,
      after: summary
    });

    return summary;
  });

  app.get("/api/v1/integrations/connections/:id/ifood/pending-items", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.read");
    const params = parseParams(idParamsSchema, request);
    const query = parseQuery(listQuerySchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true }
    });
    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }

    const items = await prisma.ifoodOrderPendingItem.findMany({
      where: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        integrationConnectionId: connection.id,
        status: "PENDING_LINK",
        ...(query.search ? { OR: [{ name: { contains: query.search } }, { externalCode: { contains: query.search } }, { ifoodItemId: { contains: query.search } }] } : {})
      },
      select: {
        id: true,
        ifoodOrderId: true,
        ifoodItemId: true,
        externalCode: true,
        ean: true,
        name: true,
        quantity: true,
        unitPrice: true,
        status: true,
        lastError: true,
        createdAt: true,
        sale: { select: { id: true, status: true, total: true, createdAt: true, idempotencyKey: true } }
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });

    const page = paginated(items, query.limit);
    const orderIds = page.data.map((item) => item.ifoodOrderId).filter((value): value is string => Boolean(value));
    if (orderIds.length === 0) {
      return page;
    }

    const events = await prisma.webhookEvent.findMany({
      where: {
        companyId: request.tenant!.companyId,
        channel: "IFOOD",
        OR: orderIds.flatMap((orderId) => [{ payload: { path: "$.orderId", equals: orderId } }, { payload: { path: "$.metadata.id", equals: orderId } }])
      },
      select: { payload: true },
      orderBy: { createdAt: "desc" }
    });
    const displayByOrderId = new Map<string, string>();
    for (const event of events) {
      const payload = recordValue(event.payload);
      const orderId = textValue(payload.orderId) ?? textValue(recordValue(payload.metadata).id);
      const displayId = textValue(payload.orderDisplayId);
      if (orderId && displayId && !displayByOrderId.has(orderId)) {
        displayByOrderId.set(orderId, displayId);
      }
    }

    return {
      ...page,
      data: page.data.map((item) => ({ ...item, ifoodDisplayId: displayByOrderId.get(item.ifoodOrderId) ?? null }))
    };
  });

  app.get("/api/v1/sales/:id/ifood/details", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "sale.read");
    const params = parseParams(idParamsSchema, request);
    const sale = await prisma.sale.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, branchId: request.tenant!.branchId, source: "IFOOD" },
      select: { id: true, idempotencyKey: true, total: true }
    });
    if (!sale) {
      throw errors.notFound("IFOOD_SALE_NOT_FOUND", "Pedido iFood não encontrado.");
    }

    const [, , connectionId, orderId] = sale.idempotencyKey.split(":");
    if (!connectionId || !orderId) {
      throw errors.conflict("IFOOD_ORDER_ID_MISSING", "Pedido iFood sem identificador externo.");
    }

    const connection = await prisma.integrationConnection.findFirst({
      where: { id: connectionId, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true, accessToken: true, refreshToken: true, tokenExpiresAt: true }
    });
    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
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

    const details = await getIfoodOrderDetails({ accessToken: token.accessToken, orderId });
    return {
      orderId,
      displayId: ifoodOrderDisplayId(details),
      orderItems: ifoodOrderItemDiagnostics(details),
      paymentMethods: ifoodPaymentDiagnostics(details, new Prisma.Decimal(sale.total))
    };
  });

  app.post("/api/v1/integrations/connections/:id/ifood/pending-items/:pendingItemId/resolve", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema.extend({ pendingItemId: z.string().cuid() }), request);
    const body = parseBody(linkIfoodCatalogItemBodySchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true }
    });
    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }

    const result = await prisma.$transaction((tx) =>
      resolveIfoodPendingItem(tx, {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        pendingItemId: params.pendingItemId,
        productId: body.productId,
        userId: request.tenant!.userId
      })
    );
    await audit(request, {
      action: "integration_connection.ifood_pending_item_resolve",
      entityType: "IfoodOrderPendingItem",
      entityId: params.pendingItemId,
      after: result
    });
    return result;
  });

  app.post("/api/v1/sales/:id/ifood/action", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(ifoodOrderActionBodySchema, request);
    const sale = await prisma.sale.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, branchId: request.tenant!.branchId, source: "IFOOD" },
      select: { id: true, status: true, idempotencyKey: true }
    });
    if (!sale) {
      throw errors.notFound("IFOOD_SALE_NOT_FOUND", "Pedido iFood não encontrado.");
    }
    if (sale.status === "CANCELLED" || sale.status === "COMPLETED") {
      throw errors.conflict("IFOOD_SALE_CLOSED", "Pedido iFood já está encerrado.");
    }
    const [, , connectionId, orderId] = sale.idempotencyKey.split(":");
    if (!connectionId || !orderId) {
      throw errors.conflict("IFOOD_ORDER_ID_MISSING", "Pedido iFood sem identificador externo.");
    }
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: connectionId, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true, accessToken: true, refreshToken: true, tokenExpiresAt: true }
    });
    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
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
    const result = await transitionIfoodOrder({ accessToken: token.accessToken, orderId, action: body.action });
    await audit(request, {
      action: "integration_connection.ifood_order_action",
      entityType: "Sale",
      entityId: sale.id,
      after: { action: body.action, orderId }
    });
    return { action: body.action, orderId, result };
  });

  app.post("/api/v1/integrations/connections/:id/ifood/events/reprocess", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(reprocessIfoodOrderEventsBodySchema, request);
    const connection = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, channel: "IFOOD" },
      select: { id: true, companyId: true, branchId: true, externalAccountId: true, status: true }
    });

    if (!connection) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão iFood não encontrada.");
    }

    const items = await prisma.webhookEvent.findMany({
      where: {
        companyId: request.tenant!.companyId,
        integrationConnectionId: connection.id,
        channel: "IFOOD",
        status: { in: ["RECEIVED", "FAILED"] }
      },
      select: {
        id: true,
        externalEventId: true,
        eventType: true,
        payload: true
      },
      orderBy: { createdAt: "asc" },
      take: body.limit
    });

    if (items.length === 0) {
      return { processed: 0, failed: 0, message: "Nenhum evento pendente para reprocessar." };
    }

    const events = items.map((item) => item.payload as unknown as IfoodOrderEvent);
    return app.inject({
      method: "POST",
      url: `/api/v1/integrations/connections/${connection.id}/ifood/events`,
      headers: {
        authorization: request.headers.authorization as string,
        "x-correlation-id": request.correlationId
      },
      payload: { events, acknowledge: true }
    }).then((response) => {
      if (response.statusCode >= 400) {
        throw errors.conflict("IFOOD_REPROCESS_FAILED", "Não foi possível reprocessar os eventos pendentes do iFood.");
      }
      return JSON.parse(response.body);
    });
  });

  app.get("/api/v1/reports/jobs", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "sale.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.reportJob.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }]
      },
      select: { id: true, type: true, status: true, filters: true, resultSummary: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/reports/jobs", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "sale.read");
    const body = parseBody(createReportJobBodySchema, request);
    await assertBranch(request.tenant!.companyId, body.branchId);

    const job = await prisma.reportJob.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: body.branchId ?? request.tenant!.branchId,
        type: body.type,
        ...(body.filters !== undefined ? { filters: body.filters as Prisma.InputJsonValue } : {}),
        createdBy: request.tenant!.userId
      },
      select: { id: true, type: true, status: true, filters: true, resultSummary: true, createdAt: true }
    });

    await audit(request, { action: "report_job.create", entityType: "ReportJob", entityId: job.id, after: job });
    return reply.status(201).send(job);
  });

  app.get("/api/v1/search", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "company.read");
    const query = parseQuery(listQuerySchema, request);
    if (!query.search) {
      return { data: [], nextCursor: null };
    }

    const take = Math.min(query.limit, 25);
    const [products, customers, suppliers, sales] = await Promise.all([
      prisma.product.findMany({
        where: {
          companyId: request.tenant!.companyId,
          active: true,
          OR: [{ name: { contains: query.search } }, { sku: { contains: query.search } }, { barcodes: { some: { barcode: { contains: query.search } } } }]
        },
        select: { id: true, sku: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take
      }),
      prisma.customer.findMany({
        where: {
          companyId: request.tenant!.companyId,
          active: true,
          OR: [{ name: { contains: query.search } }, { document: { contains: query.search } }, { email: { contains: query.search } }]
        },
        select: { id: true, name: true, document: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take
      }),
      prisma.supplier.findMany({
        where: {
          companyId: request.tenant!.companyId,
          active: true,
          OR: [{ name: { contains: query.search } }, { document: { contains: query.search } }, { email: { contains: query.search } }]
        },
        select: { id: true, name: true, document: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take
      }),
      prisma.sale.findMany({
        where: {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          customer: { name: { contains: query.search } }
        },
        select: { id: true, total: true, status: true, source: true, createdAt: true, customer: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take
      })
    ]);

    const data = [
      ...products.map((item) => ({ ...item, resultType: "Produto", subtitle: item.sku })),
      ...customers.map((item) => ({ ...item, resultType: "Cliente", subtitle: item.document ?? item.email })),
      ...suppliers.map((item) => ({ ...item, resultType: "Fornecedor", subtitle: item.document ?? item.email })),
      ...sales.map((item) => ({ ...item, resultType: "Venda", name: item.customer?.name ?? "Venda sem cliente", subtitle: item.source }))
    ].slice(0, query.limit);

    return { data, nextCursor: null };
  });
}
