import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@erp/config";
import { signUserAccessToken } from "@erp/security";

class DecimalMock {
  private readonly value: number;

  constructor(value: string | number | DecimalMock) {
    this.value = Number(value);
  }

  lessThanOrEqualTo(other: string | number | DecimalMock) {
    return this.value <= Number(other);
  }

  toString() {
    return String(this.value);
  }

  valueOf() {
    return this.value;
  }
}

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  sale: {
    aggregate: vi.fn(),
    findMany: vi.fn()
  },
  stockBalance: {
    count: vi.fn(),
    findMany: vi.fn()
  },
  purchase: {
    count: vi.fn()
  },
  financialEntry: {
    findMany: vi.fn()
  }
}));

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

describe("dashboard security", () => {
  beforeAll(() => {
    for (const [key, value] of Object.entries(testConfig)) {
      process.env[key] = String(value);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue({ id: "user_1" });
    prismaMock.sale.aggregate.mockResolvedValue({ _sum: { total: new DecimalMock(100) }, _count: { id: 2 } });
    prismaMock.stockBalance.count.mockResolvedValue(0);
    prismaMock.purchase.count.mockResolvedValue(0);
    prismaMock.stockBalance.findMany.mockResolvedValue([]);
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.financialEntry.findMany.mockResolvedValue([]);
  });

  it("requires both sales and inventory permissions", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard",
      headers: { authorization: `Bearer ${await userToken(["sale.read"])}` }
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.sale.aggregate).not.toHaveBeenCalled();
    await app.close();
  });

  it("uses authenticated company and branch in dashboard queries", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/dashboard?companyId=company_evil&branchId=branch_evil",
      headers: { authorization: `Bearer ${await userToken(["sale.read", "inventory.read"])}` }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.sale.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company_1",
          branchId: "branch_1"
        })
      })
    );
    expect(prismaMock.stockBalance.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company_1",
          branchId: "branch_1"
        })
      })
    );
    await app.close();
  });
});
