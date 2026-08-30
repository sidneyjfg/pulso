import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@erp/config";
import { signUserAccessToken } from "@erp/security";

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  branch: { findFirst: vi.fn() },
  alert: { findMany: vi.fn() },
  alertRule: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  importJob: {
    findMany: vi.fn(),
    create: vi.fn()
  },
  integrationConnection: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  webhookEvent: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn()
  },
  warehouse: { findFirst: vi.fn() },
  customer: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn()
  },
  stockMovement: { findUnique: vi.fn(), create: vi.fn() },
  stockBalance: { findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  saleItem: { create: vi.fn(), update: vi.fn() },
  ifoodOrderPendingItem: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  ifoodCatalogItem: { findUnique: vi.fn(), upsert: vi.fn() },
  reportJob: {
    findMany: vi.fn(),
    create: vi.fn()
  },
  product: { findMany: vi.fn(), findFirst: vi.fn() },
  supplier: { findMany: vi.fn() },
  financialEntry: { findMany: vi.fn() },
  sale: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  $executeRaw: vi.fn(),
  $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(prismaMock))
}));

const ifoodServiceMock = vi.hoisted(() => ({
  acknowledgeIfoodOrderEvents: vi.fn(),
  calculateIfoodInventoryAmount: vi.fn(() => 10),
  confirmIfoodOrder: vi.fn(),
  connectIfoodByAuthorizationCode: vi.fn(),
  createIfoodCategory: vi.fn(),
  getIfoodOrderDetails: vi.fn(),
  healthCheckIfoodMerchant: vi.fn(),
  listIfoodCancellationReasons: vi.fn(),
  listIfoodSellableItems: vi.fn(),
  pollIfoodOrderEvents: vi.fn(),
  publishSimpleIfoodItem: vi.fn(),
  requestIfoodCancellation: vi.fn(),
  resolveIfoodAccessToken: vi.fn(async () => ({ accessToken: "ifood_access_token", refreshed: null })),
  startIfoodDeviceAuthorization: vi.fn(),
  transitionIfoodOrder: vi.fn(),
  updateIfoodInventory: vi.fn(),
  uploadIfoodImage: vi.fn()
}));

vi.mock("@erp/database", () => ({
  Prisma: {
    Decimal: class Decimal {
      private readonly value: number;

      constructor(value: string | number | { valueOf(): number }) {
        this.value = Number(value);
      }

      plus(other: string | number | { valueOf(): number }) {
        return new Decimal(this.value + Number(other));
      }

      minus(other: string | number | { valueOf(): number }) {
        return new Decimal(this.value - Number(other));
      }

      times(other: string | number | { valueOf(): number }) {
        return new Decimal(this.value * Number(other));
      }

      negated() {
        return new Decimal(-this.value);
      }

      lessThan(other: string | number | { valueOf(): number }) {
        return this.value < Number(other);
      }

      abs() {
        return new Decimal(Math.abs(this.value));
      }

      valueOf() {
        return this.value;
      }

      toString() {
        return this.value.toString();
      }
    }
  },
  prisma: prismaMock
}));

vi.mock("../modules/growth/ifood.service.js", () => ifoodServiceMock);

const testConfig: AppConfig = {
  NODE_ENV: "test",
  APP_NAME: "ERP",
  APP_ENV: "test",
  WEB_URL: "http://localhost:3000",
  API_HOST: "localhost",
  API_PORT: 3333,
  API_URL: "http://localhost:3333",
  TRUST_PROXY: false,
  CORS_ORIGINS: "http://localhost:3000",
  DATABASE_URL: "mysql://erp:erp@localhost:3306/erp",
  REDIS_URL: "redis://localhost:6379",
  JWT_USER_SECRET: "test_user_secret_0123456789abcdef0123456789abcdef",
  JWT_USER_ISSUER: "erp-test",
  JWT_USER_AUDIENCE: "erp-user-api",
  JWT_USER_EXPIRES_IN: "15m",
  JWT_ADMIN_SECRET: "test_admin_secret_0123456789abcdef0123456789abcdef",
  JWT_ADMIN_ISSUER: "erp-test",
  JWT_ADMIN_AUDIENCE: "erp-admin-api",
  JWT_ADMIN_EXPIRES_IN: "10m",
  REFRESH_TOKEN_EXPIRES_IN_DAYS: 30,
  COOKIE_DOMAIN: "localhost",
  COOKIE_SECURE: false,
  COOKIE_SAME_SITE: "lax",
  DATA_ENCRYPTION_KEY: "test_encryption_key_0123456789abcdef0123456789abcdef",
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_WINDOW: "1m",
  RATE_LIMIT_STORE: "memory",
  LOGIN_RATE_LIMIT_MAX: 10,
  LOGIN_RATE_LIMIT_WINDOW: "15m",
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_PATH: "./storage",
  LOG_LEVEL: "silent",
  IFOOD_ENABLED: false,
  FOOD99_ENABLED: false,
  DEV_SEED: false,
  DEV_ADMIN_EMAIL: "admin@local.test",
  DEV_ADMIN_PASSWORD: "ChangeMe123!",
  DEV_ORGANIZATION_NAME: "Empresa Demonstração",
  DEV_COMPANY_NAME: "Empresa Teste LTDA",
  DEV_BRANCH_NAME: "Loja Principal"
};

async function userToken(permissions: string[]) {
  return signUserAccessToken(testConfig, {
    tokenType: "USER_ACCESS",
    userId: "user_1",
    sessionId: "session_1",
    organizationId: "org_1",
    companyId: "company_1",
    branchId: "branch_1",
    role: "Admin",
    permissions
  });
}

describe("growth foundation security", () => {
  beforeAll(() => {
    for (const [key, value] of Object.entries(testConfig)) {
      process.env[key] = String(value);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue({ id: "user_1" });
  });

  it("filters alerts by authenticated company and current branch", async () => {
    prismaMock.alert.findMany.mockResolvedValue([]);
    prismaMock.financialEntry.findMany.mockResolvedValue([]);
    prismaMock.sale.findMany.mockResolvedValue([]);
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/alerts?search=estoque",
      headers: { authorization: `Bearer ${await userToken(["inventory.read"])}` }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company_1",
          OR: expect.arrayContaining([
            expect.objectContaining({ branchId: "branch_1" }),
            expect.objectContaining({ branchId: null })
          ])
        })
      })
    );
    await app.close();
  });

  it("derives import job tenant fields from the token", async () => {
    prismaMock.importJob.create.mockResolvedValue({
      id: "import_1",
      source: "CSV",
      status: "PENDING",
      fileName: "produtos.csv",
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      createdAt: new Date()
    });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/imports/jobs",
      headers: { authorization: `Bearer ${await userToken(["product.create"])}` },
      payload: {
        companyId: "company_evil",
        branchId: undefined,
        userId: "user_evil",
        source: "CSV",
        fileName: "produtos.csv"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.importJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company_1",
          branchId: "branch_1",
          createdBy: "user_1"
        })
      })
    );
    await app.close();
  });

  it("denies integration creation without manage permission", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/connections",
      headers: { authorization: `Bearer ${await userToken(["integration.read"])}` },
      payload: {
        channel: "IFOOD",
        externalAccountId: "conta-demo"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.integrationConnection.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("prevents duplicate ifood connections for the current branch", async () => {
    prismaMock.integrationConnection.findFirst.mockResolvedValue({ id: "connection_1" });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/connections",
      headers: { authorization: `Bearer ${await userToken(["integration.manage"])}` },
      payload: {
        channel: "IFOOD"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(prismaMock.integrationConnection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company_1",
          branchId: "branch_1",
          channel: "IFOOD"
        })
      })
    );
    expect(prismaMock.integrationConnection.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("denies ifood connect without manage permission", async () => {
    prismaMock.integrationConnection.findFirst.mockResolvedValue({
      id: "connection_1",
      channel: "IFOOD",
      status: "DISCONNECTED",
      externalAccountId: null
    });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await userToken(["integration.read"]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/connections/cjld2cjxh0000qzrmn831i7rn/ifood/connect",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        merchantId: "0f8fad5b-d9cb-469f-a165-70867728950e",
        mode: "GROCERIES"
      }
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("denies ifood event ingestion without manage permission", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await userToken(["integration.read"]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/connections/cjld2cjxh0000qzrmn831i7rn/ifood/events",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        events: [
          {
            externalEventId: "evt-1",
            eventType: "order.placed",
            order: {
              externalOrderId: "order-1",
              status: "CONFIRMED",
              items: [{ productId: "cjld2cjxh0000qzrmn831i7ra", quantity: "1", unitPrice: "10.00", discount: "0" }]
            }
          }
        ],
        acknowledge: true
      }
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.webhookEvent.upsert).not.toHaveBeenCalled();
    await app.close();
  });

  it("does not duplicate sale or stock reservation when the same ifood event is received twice", async () => {
    const productId = "cjld2cjxh0000qzrmn831i7ra";
    prismaMock.integrationConnection.findFirst.mockResolvedValue({
      id: "cjld2cjxh0000qzrmn831i7rn",
      companyId: "company_1",
      branchId: "branch_1",
      externalAccountId: "merchant_1",
      status: "CONNECTED",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      createdBy: "user_1"
    });
    prismaMock.webhookEvent.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "webhook_1", status: "PROCESSED" });
    prismaMock.webhookEvent.upsert.mockResolvedValue({ id: "webhook_1" });
    prismaMock.webhookEvent.update.mockResolvedValue({ id: "webhook_1" });
    prismaMock.webhookEvent.findMany.mockResolvedValue([]);
    prismaMock.product.findMany.mockResolvedValue([{ id: productId }]);
    prismaMock.warehouse.findFirst.mockResolvedValue({ id: "cjld2cjxh0000qzrmn831i7rw" });
    prismaMock.customer.findFirst.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({ id: "customer_1" });
    prismaMock.sale.findFirst.mockResolvedValue(null);
    prismaMock.sale.create.mockResolvedValue({ id: "sale_1" });
    prismaMock.saleItem.create.mockResolvedValue({ id: "sale_item_1", productId, quantity: { toString: () => "2" } });
    prismaMock.stockBalance.upsert.mockResolvedValue({ id: "balance_1", quantity: { toString: () => "10" } });
    prismaMock.$executeRaw.mockResolvedValue(1);
    prismaMock.integrationConnection.update.mockResolvedValue({ id: "cjld2cjxh0000qzrmn831i7rn" });
    prismaMock.auditLog.create.mockResolvedValue({});

    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const payload = {
      events: [
        {
          externalEventId: "evt-ifood-duplicate-1",
          eventType: "order.placed",
          order: {
            externalOrderId: "ifood-order-1",
            status: "CONFIRMED",
            warehouseId: "cjld2cjxh0000qzrmn831i7rw",
            customer: { name: "Cliente iFood" },
            items: [{ productId, quantity: "2", unitPrice: "10.00", discount: "0" }]
          }
        }
      ],
      acknowledge: false
    };

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/connections/cjld2cjxh0000qzrmn831i7rn/ifood/events",
      headers: { authorization: `Bearer ${await userToken(["integration.manage"])}` },
      payload
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/connections/cjld2cjxh0000qzrmn831i7rn/ifood/events",
      headers: { authorization: `Bearer ${await userToken(["integration.manage"])}` },
      payload
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ received: 1, processed: 1, duplicates: 0, reservedSales: 1 });
    expect(second.json()).toMatchObject({ received: 1, processed: 0, duplicates: 1, reservedSales: 0 });
    expect(prismaMock.sale.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.saleItem.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.stockBalance.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.webhookEvent.update).toHaveBeenCalledWith({
      where: { id: "webhook_1" },
      data: { attempts: { increment: 1 } }
    });
    expect(prismaMock.webhookEvent.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "webhook_1" },
        data: expect.objectContaining({ status: "DUPLICATE" })
      })
    );
    await app.close();
  });

  it("stores catalog mapping when resolving an ifood pending item", async () => {
    prismaMock.integrationConnection.findFirst.mockResolvedValue({
      id: "cjld2cjxh0000qzrmn831i7rn"
    });
    prismaMock.ifoodOrderPendingItem.findFirst.mockResolvedValue({
      id: "cjld2cjxh0000qzrmn831i7rp",
      saleId: "sale_1",
      saleItemId: "sale_item_1",
      integrationConnectionId: "cjld2cjxh0000qzrmn831i7rn",
      ifoodOrderId: "ifood-order-1",
      ifoodItemId: "ifood-item-1",
      externalCode: "IFOOD-001",
      quantity: { toString: () => "1" },
      name: "Item iFood",
      sale: { id: "sale_1", status: "PENDING", warehouseId: "cjld2cjxh0000qzrmn831i7rw" }
    });
    prismaMock.product.findFirst.mockResolvedValue({ id: "cjld2cjxh0000qzrmn831i7ra", sku: "SKU-001" });
    prismaMock.ifoodCatalogItem.findUnique.mockResolvedValue(null);
    prismaMock.ifoodCatalogItem.upsert.mockResolvedValue({ id: "mapping_1" });
    prismaMock.stockBalance.upsert.mockResolvedValue({ id: "balance_1", quantity: { toString: () => "10" } });
    prismaMock.$executeRaw.mockResolvedValue(1);
    prismaMock.saleItem.update.mockResolvedValue({ id: "sale_item_1" });
    prismaMock.ifoodOrderPendingItem.update.mockResolvedValue({ id: "cjld2cjxh0000qzrmn831i7rp" });
    prismaMock.ifoodOrderPendingItem.count.mockResolvedValue(1);
    prismaMock.auditLog.create.mockResolvedValue({});

    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/connections/cjld2cjxh0000qzrmn831i7rn/ifood/pending-items/cjld2cjxh0000qzrmn831i7rp/resolve",
      headers: { authorization: `Bearer ${await userToken(["integration.manage"])}` },
      payload: {
        productId: "cjld2cjxh0000qzrmn831i7ra"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.ifoodCatalogItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          integrationConnectionId_ifoodItemId: {
            integrationConnectionId: "cjld2cjxh0000qzrmn831i7rn",
            ifoodItemId: "ifood-item-1"
          }
        },
        create: expect.objectContaining({
          companyId: "company_1",
          branchId: "branch_1",
          integrationConnectionId: "cjld2cjxh0000qzrmn831i7rn",
          productId: "cjld2cjxh0000qzrmn831i7ra",
          ifoodItemId: "ifood-item-1",
          ifoodProductId: "ifood-item-1",
          externalCode: "IFOOD-001",
          status: "SYNCED"
        })
      })
    );
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("releases reserved stock once when an ifood sale is cancelled", async () => {
    prismaMock.integrationConnection.findFirst.mockResolvedValue({
      id: "cjld2cjxh0000qzrmn831i7rn",
      companyId: "company_1",
      branchId: "branch_1",
      externalAccountId: "merchant_1",
      status: "CONNECTED",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      createdBy: "user_1"
    });
    prismaMock.webhookEvent.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "webhook_cancel_1", status: "PROCESSED" });
    prismaMock.webhookEvent.upsert.mockResolvedValue({ id: "webhook_cancel_1" });
    prismaMock.webhookEvent.update.mockResolvedValue({ id: "webhook_cancel_1" });
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "sale_1",
      status: "RESERVED",
      warehouseId: "cjld2cjxh0000qzrmn831i7rw",
      items: [{ productId: "cjld2cjxh0000qzrmn831i7ra", quantity: { toString: () => "2" } }]
    });
    prismaMock.stockBalance.upsert.mockResolvedValue({ id: "balance_1", quantity: { toString: () => "10" } });
    prismaMock.$executeRaw.mockResolvedValue(1);
    prismaMock.sale.update.mockResolvedValue({ id: "sale_1" });
    prismaMock.integrationConnection.update.mockResolvedValue({ id: "cjld2cjxh0000qzrmn831i7rn" });
    prismaMock.auditLog.create.mockResolvedValue({});

    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const payload = {
      events: [
        {
          externalEventId: "evt-ifood-cancel-1",
          eventType: "order.cancelled",
          order: {
            externalOrderId: "ifood-order-cancel-1",
            status: "CANCELLED",
            cancelReason: "Cancelado no iFood",
            items: [{ productId: "cjld2cjxh0000qzrmn831i7ra", quantity: "2", unitPrice: "10.00", discount: "0" }]
          }
        }
      ],
      acknowledge: false
    };

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/connections/cjld2cjxh0000qzrmn831i7rn/ifood/events",
      headers: { authorization: `Bearer ${await userToken(["integration.manage"])}` },
      payload
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/integrations/connections/cjld2cjxh0000qzrmn831i7rn/ifood/events",
      headers: { authorization: `Bearer ${await userToken(["integration.manage"])}` },
      payload
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ received: 1, processed: 1, duplicates: 0, cancelledSales: 1 });
    expect(second.json()).toMatchObject({ received: 1, processed: 0, duplicates: 1, cancelledSales: 0 });
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sale_1" },
        data: expect.objectContaining({
          status: "CANCELLED",
          cancelReason: "Cancelado no iFood"
        })
      })
    );
    expect(prismaMock.stockMovement.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("requests cancellation on ifood with a valid remote reason", async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "cjld2cjxh0000qzrmn831i7rs",
      status: "RESERVED",
      idempotencyKey: "ifood:order:cjld2cjxh0000qzrmn831i7rn:ifood-order-1"
    });
    prismaMock.integrationConnection.findFirst.mockResolvedValue({
      id: "cjld2cjxh0000qzrmn831i7rn",
      accessToken: "encrypted_access",
      refreshToken: "encrypted_refresh",
      tokenExpiresAt: null
    });
    prismaMock.auditLog.create.mockResolvedValue({});
    ifoodServiceMock.listIfoodCancellationReasons.mockResolvedValue([{ code: "503", description: "Item indisponível" }]);
    ifoodServiceMock.requestIfoodCancellation.mockResolvedValue({ status: "ACCEPTED" });

    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/sales/cjld2cjxh0000qzrmn831i7rs/ifood/action",
      headers: { authorization: `Bearer ${await userToken(["integration.manage"])}` },
      payload: {
        action: "REQUEST_CANCELLATION",
        reasonCode: "503"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ action: "REQUEST_CANCELLATION", orderId: "ifood-order-1", reasonCode: "503" });
    expect(ifoodServiceMock.listIfoodCancellationReasons).toHaveBeenCalledWith({ accessToken: "ifood_access_token", orderId: "ifood-order-1" });
    expect(ifoodServiceMock.requestIfoodCancellation).toHaveBeenCalledWith({ accessToken: "ifood_access_token", orderId: "ifood-order-1", reasonCode: "503" });
    expect(prismaMock.sale.update).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects ifood cancellation request when reason is not valid for the order", async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: "cjld2cjxh0000qzrmn831i7rs",
      status: "RESERVED",
      idempotencyKey: "ifood:order:cjld2cjxh0000qzrmn831i7rn:ifood-order-1"
    });
    prismaMock.integrationConnection.findFirst.mockResolvedValue({
      id: "cjld2cjxh0000qzrmn831i7rn",
      accessToken: "encrypted_access",
      refreshToken: "encrypted_refresh",
      tokenExpiresAt: null
    });
    ifoodServiceMock.listIfoodCancellationReasons.mockResolvedValue([{ code: "503", description: "Item indisponível" }]);

    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/sales/cjld2cjxh0000qzrmn831i7rs/ifood/action",
      headers: { authorization: `Bearer ${await userToken(["integration.manage"])}` },
      payload: {
        action: "REQUEST_CANCELLATION",
        reasonCode: "501"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(ifoodServiceMock.requestIfoodCancellation).not.toHaveBeenCalled();
    await app.close();
  });

  it("bounds global search and filters every source by tenant", async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.customer.findMany.mockResolvedValue([]);
    prismaMock.supplier.findMany.mockResolvedValue([]);
    prismaMock.sale.findMany.mockResolvedValue([]);
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/search?search=coca&limit=100",
      headers: { authorization: `Bearer ${await userToken(["company.read"])}` }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company_1" }), take: 25 }));
    expect(prismaMock.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company_1" }), take: 25 }));
    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company_1" }), take: 25 }));
    expect(prismaMock.sale.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company_1", branchId: "branch_1" }), take: 25 }));
    await app.close();
  });
});
