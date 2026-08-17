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
  reportJob: {
    findMany: vi.fn(),
    create: vi.fn()
  },
  product: { findMany: vi.fn() },
  customer: { findMany: vi.fn() },
  supplier: { findMany: vi.fn() },
  sale: { findMany: vi.fn() }
}));

vi.mock("@erp/database", () => ({
  Prisma: {
    Decimal: class Decimal {
      private readonly value: number;

      constructor(value: string | number) {
        this.value = Number(value);
      }

      valueOf() {
        return this.value;
      }
    }
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
