import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@erp/config";
import { signUserAccessToken } from "@erp/security";

const prismaMock = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn()
  },
  auditLog: {
    create: vi.fn()
  },
  customer: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  supplier: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }
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

describe("customers and suppliers security", () => {
  beforeAll(() => {
    for (const [key, value] of Object.entries(testConfig)) {
      process.env[key] = String(value);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue({ id: "user_1" });
  });

  it("filters customer list by authenticated company", async () => {
    prismaMock.customer.findMany.mockResolvedValue([]);
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await userToken(["customer.read"]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/customers?search=joao",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: "company_1" })
      })
    );
    await app.close();
  });

  it("derives customer company from tenant instead of request body", async () => {
    prismaMock.customer.create.mockResolvedValue({
      id: "cm12345678901234567890123",
      type: "INDIVIDUAL",
      name: "Joao Cliente",
      document: null,
      email: null,
      phone: null,
      notes: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await userToken(["customer.manage"]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/customers",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        companyId: "company_evil",
        type: "INDIVIDUAL",
        name: "Joao Cliente"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company_1",
          name: "Joao Cliente"
        })
      })
    );
    expect(prismaMock.customer.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: "company_evil" })
      })
    );
    await app.close();
  });

  it("does not update supplier from another tenant", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null);
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await userToken(["supplier.manage"]);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/suppliers/cm12345678901234567890123",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Fornecedor Alterado" }
    });

    expect(response.statusCode).toBe(404);
    expect(prismaMock.supplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "cm12345678901234567890123",
          companyId: "company_1"
        })
      })
    );
    expect(prismaMock.supplier.update).not.toHaveBeenCalled();
    await app.close();
  });

  it("denies supplier creation without manage permission", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await userToken(["supplier.read"]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: "COMPANY",
        name: "Fornecedor Teste",
        document: "12345678000190"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.supplier.create).not.toHaveBeenCalled();
    await app.close();
  });
});
