import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@erp/config";
import { signUserAccessToken } from "@erp/security";

class DecimalMock {
  private readonly value: number;

  constructor(value: string | number | DecimalMock) {
    this.value = Number(value);
  }

  plus(other: string | number | DecimalMock) {
    return new DecimalMock(this.value + Number(other));
  }

  minus(other: string | number | DecimalMock) {
    return new DecimalMock(this.value - Number(other));
  }

  times(other: string | number | DecimalMock) {
    return new DecimalMock(this.value * Number(other));
  }

  negated() {
    return new DecimalMock(-this.value);
  }

  lessThan(other: string | number | DecimalMock) {
    return this.value < Number(other);
  }

  abs() {
    return new DecimalMock(Math.abs(this.value));
  }

  equals(other: string | number | DecimalMock) {
    return this.value === Number(other);
  }

  valueOf() {
    return this.value;
  }
}

const prismaMock = vi.hoisted(() => {
  const tx = {
    sale: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn()
    },
    purchase: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn()
    },
    purchaseItem: {
      updateMany: vi.fn()
    },
    stockMovement: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    stockBalance: {
      upsert: vi.fn(),
      updateMany: vi.fn()
    }
  };

  type TxMock = typeof tx;

  return {
    tx,
    user: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    warehouse: { findFirst: vi.fn() },
    customer: { findFirst: vi.fn() },
    supplier: { findFirst: vi.fn() },
    product: { findMany: vi.fn() },
    sale: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    purchase: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn()
    },
    $transaction: vi.fn(async (callback: (tx: TxMock) => unknown) => callback(tx))
  };
});

vi.mock("@erp/database", () => ({
  Prisma: {
    Decimal: DecimalMock
  },
  prisma: prismaMock
}));

const testConfig: AppConfig = {
  NODE_ENV: "test",
  APP_NAME: "ERP",
  APP_ENV: "test",
  WEB_URL: "http://localhost:3000",
  API_HOST: "localhost",
  API_PORT: 3333,
  API_URL: "http://localhost:3333",
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

async function token() {
  return signUserAccessToken(testConfig, {
    tokenType: "USER_ACCESS",
    userId: "user_1",
    sessionId: "session_1",
    organizationId: "org_1",
    companyId: "company_1",
    branchId: "branch_1",
    role: "Admin",
    permissions: ["sale.read", "sale.create", "sale.cancel", "purchase.read", "purchase.create", "purchase.receive"]
  });
}

function setupCommon() {
  prismaMock.user.findFirst.mockResolvedValue({ id: "user_1" });
  prismaMock.warehouse.findFirst.mockResolvedValue({ id: "warehouse_1" });
  prismaMock.customer.findFirst.mockResolvedValue({ id: "customer_1" });
  prismaMock.supplier.findFirst.mockResolvedValue({ id: "supplier_1" });
  prismaMock.product.findMany.mockResolvedValue([{ id: "cm12345678901234567890123" }]);
  prismaMock.tx.stockMovement.findUnique.mockResolvedValue(null);
  prismaMock.tx.stockBalance.upsert.mockResolvedValue({ id: "balance_1", quantity: new DecimalMock(10) });
  prismaMock.tx.stockBalance.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.tx.stockMovement.create.mockResolvedValue({ id: "movement_1", currentQuantity: new DecimalMock(9) });
}

describe("operation business flows", () => {
  beforeAll(() => {
    for (const [key, value] of Object.entries(testConfig)) {
      process.env[key] = String(value);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setupCommon();
  });

  it("sale creation reduces stock with a SALE movement", async () => {
    prismaMock.sale.findUnique.mockResolvedValue(null);
    prismaMock.tx.sale.create.mockResolvedValue({
      id: "sale_1",
      items: [{ productId: "cm12345678901234567890123", quantity: new DecimalMock(2) }]
    });
    prismaMock.tx.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale_1", status: "COMPLETED" });
    const { buildApp } = await import("../../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/sales",
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        customerId: "cm12345678901234567890124",
        warehouseId: "cm12345678901234567890125",
        source: "MANUAL",
        idempotencyKey: "sale-create-key",
        items: [{ productId: "cm12345678901234567890123", quantity: "2", unitPrice: "10.00" }],
        payments: [{ method: "PIX", amount: "20.00" }]
      }
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "SALE",
          quantity: expect.objectContaining({ valueOf: expect.any(Function) }),
          referenceType: "Sale"
        })
      })
    );
    await app.close();
  });

  it("sale cancellation returns stock with a CANCEL_SALE movement", async () => {
    prismaMock.tx.sale.findFirst.mockResolvedValue({
      id: "sale_1",
      status: "COMPLETED",
      warehouseId: "warehouse_1",
      items: [{ productId: "cm12345678901234567890123", quantity: new DecimalMock(2) }]
    });
    prismaMock.tx.sale.update.mockResolvedValue({ id: "sale_1" });
    prismaMock.tx.sale.findUniqueOrThrow.mockResolvedValue({ id: "sale_1", status: "CANCELLED" });
    const { buildApp } = await import("../../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/sales/cm12345678901234567890126/cancel",
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        reason: "Cliente desistiu",
        idempotencyKey: "sale-cancel-key"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "CANCEL_SALE",
          warehouseId: "warehouse_1",
          referenceType: "Sale"
        })
      })
    );
    await app.close();
  });

  it("purchase creation does not change stock", async () => {
    prismaMock.purchase.findUnique.mockResolvedValue(null);
    prismaMock.purchase.create.mockResolvedValue({ id: "purchase_1", status: "ORDERED" });
    const { buildApp } = await import("../../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/purchases",
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        supplierId: "cm12345678901234567890124",
        warehouseId: "cm12345678901234567890125",
        status: "ORDERED",
        idempotencyKey: "purchase-create-key",
        items: [{ productId: "cm12345678901234567890123", quantity: "5", unitCost: "6.00" }]
      }
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.tx.stockMovement.create).not.toHaveBeenCalled();
    await app.close();
  });

  it("purchase receiving increases stock with a PURCHASE movement", async () => {
    prismaMock.tx.purchase.findFirst.mockResolvedValue({
      id: "purchase_1",
      status: "ORDERED",
      warehouseId: "warehouse_1",
      items: [{ id: "item_1", productId: "cm12345678901234567890123", quantity: new DecimalMock(5) }]
    });
    prismaMock.tx.purchaseItem.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.tx.purchase.update.mockResolvedValue({ id: "purchase_1" });
    prismaMock.tx.purchase.findUniqueOrThrow.mockResolvedValue({ id: "purchase_1", status: "RECEIVED" });
    const { buildApp } = await import("../../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/purchases/cm12345678901234567890126/receive",
      headers: { authorization: `Bearer ${await token()}` },
      payload: {
        idempotencyKey: "purchase-receive-key"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PURCHASE",
          warehouseId: "warehouse_1",
          referenceType: "Purchase"
        })
      })
    );
    await app.close();
  });
});
