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
    stockMovement: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    stockBalance: {
      upsert: vi.fn(),
      updateMany: vi.fn()
    },
    stockTransfer: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    inventoryCount: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    inventoryCountItem: {
      update: vi.fn()
    },
    $executeRaw: vi.fn()
  };

  type TxMock = typeof tx;

  return {
    tx,
    user: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    stockTransfer: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    inventoryCount: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    stockBalance: { findMany: vi.fn() },
    stockMovement: { findMany: vi.fn() },
    warehouse: { findFirst: vi.fn() },
    branch: { findFirst: vi.fn() },
    product: {
      findFirst: vi.fn(),
      findMany: vi.fn()
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

async function token(branchId = "branch_1") {
  return signUserAccessToken(testConfig, {
    tokenType: "USER_ACCESS",
    userId: "user_1",
    sessionId: "session_1",
    organizationId: "org_1",
    companyId: "company_1",
    branchId,
    role: "Admin",
    permissions: ["inventory.read", "inventory.adjust", "inventory.transfer"]
  });
}

describe("inventory business flows", () => {
  beforeAll(() => {
    for (const [key, value] of Object.entries(testConfig)) {
      process.env[key] = String(value);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue({ id: "user_1" });
    prismaMock.auditLog.create.mockResolvedValue({});
    prismaMock.tx.stockMovement.findUnique.mockResolvedValue(null);
    prismaMock.tx.stockMovement.create.mockImplementation(async (args) => ({
      id: `movement_${args.data.type}_${args.data.productId}`,
      currentQuantity: args.data.currentQuantity
    }));
    prismaMock.tx.stockBalance.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.tx.$executeRaw.mockResolvedValue(1);
  });

  it("sending a transfer creates TRANSFER_OUT movement and marks it in transit", async () => {
    prismaMock.tx.stockTransfer.findFirst.mockResolvedValue({
      id: "transfer_1",
      status: "DRAFT",
      sourceWarehouseId: "warehouse_1",
      reason: "Reposição",
      items: [{ productId: "product_1", quantity: new DecimalMock(2) }]
    });
    prismaMock.tx.stockBalance.upsert.mockResolvedValue({ id: "balance_1", quantity: new DecimalMock(5) });
    prismaMock.tx.stockTransfer.update.mockResolvedValue({ id: "transfer_1", status: "IN_TRANSIT", sentAt: new Date() });

    const { buildApp } = await import("../../app.js");
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/inventory/transfers/cm12345678901234567890123/send",
      headers: { authorization: `Bearer ${await token()}` },
      payload: { idempotencyKey: "transfer-send-key" }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "TRANSFER_OUT",
          branchId: "branch_1",
          warehouseId: "warehouse_1",
          productId: "product_1"
        })
      })
    );
    expect(prismaMock.tx.stockTransfer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "IN_TRANSIT" }) })
    );
    await app.close();
  });

  it("receiving a transfer creates TRANSFER_IN movement and marks it received", async () => {
    prismaMock.tx.stockTransfer.findFirst.mockResolvedValue({
      id: "transfer_1",
      status: "IN_TRANSIT",
      destinationWarehouseId: "warehouse_2",
      reason: "Reposição",
      items: [{ productId: "product_1", quantity: new DecimalMock(2) }]
    });
    prismaMock.tx.stockBalance.upsert.mockResolvedValue({ id: "balance_2", quantity: new DecimalMock(1) });
    prismaMock.tx.stockTransfer.update.mockResolvedValue({ id: "transfer_1", status: "RECEIVED", receivedAt: new Date() });

    const { buildApp } = await import("../../app.js");
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/inventory/transfers/cm12345678901234567890123/receive",
      headers: { authorization: `Bearer ${await token("branch_2")}` },
      payload: { idempotencyKey: "transfer-receive-key" }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "TRANSFER_IN",
          branchId: "branch_2",
          warehouseId: "warehouse_2",
          productId: "product_1"
        })
      })
    );
    expect(prismaMock.tx.stockTransfer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "RECEIVED" }) })
    );
    await app.close();
  });

  it("confirming inventory count stores difference and creates INVENTORY_ADJUSTMENT", async () => {
    prismaMock.tx.inventoryCount.findFirst.mockResolvedValue({
      id: "inventory_1",
      status: "DRAFT",
      warehouseId: "warehouse_1",
      items: [{ id: "item_1", productId: "product_1", countedQuantity: new DecimalMock(8) }]
    });
    prismaMock.tx.stockBalance.upsert
      .mockResolvedValueOnce({ quantity: new DecimalMock(5) })
      .mockResolvedValueOnce({ id: "balance_1", quantity: new DecimalMock(5) });
    prismaMock.tx.inventoryCount.update.mockResolvedValue({ id: "inventory_1", status: "CONFIRMED", confirmedAt: new Date() });

    const { buildApp } = await import("../../app.js");
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/inventory/counts/cm12345678901234567890123/confirm",
      headers: { authorization: `Bearer ${await token()}` },
      payload: { idempotencyKey: "inventory-confirm-key" }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.tx.inventoryCountItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expectedQuantity: expect.any(DecimalMock),
          differenceQuantity: expect.any(DecimalMock)
        })
      })
    );
    expect(prismaMock.tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "INVENTORY_ADJUSTMENT",
          productId: "product_1",
          referenceType: "InventoryCount",
          referenceId: "inventory_1"
        })
      })
    );
    await app.close();
  });
});
