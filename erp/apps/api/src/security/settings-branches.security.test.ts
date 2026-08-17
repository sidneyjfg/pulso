import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@erp/config";
import { signUserAccessToken } from "@erp/security";

const prismaMock = vi.hoisted(() => {
  const tx = {
    branch: { create: vi.fn() },
    warehouse: { create: vi.fn() },
    userCompanyAccess: { updateMany: vi.fn() },
    userBranchAccess: { create: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
    user: { findUniqueOrThrow: vi.fn() }
  };

  return {
    $transaction: vi.fn(async (callback: (txClient: typeof tx) => unknown) => callback(tx)),
    tx,
    user: { findFirst: vi.fn() },
    role: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    userPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    userBranchAccess: {
      findFirst: vi.fn()
    },
    branch: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    warehouse: {
      create: vi.fn()
    }
  };
});

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

describe("settings and branch security", () => {
  beforeAll(() => {
    for (const [key, value] of Object.entries(testConfig)) {
      process.env[key] = String(value);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue({ id: "user_1" });
  });

  it("stores preferences scoped to authenticated user, company and branch", async () => {
    prismaMock.userPreference.findUnique.mockResolvedValue(null);
    prismaMock.userPreference.upsert.mockResolvedValue({
      darkMode: true,
      compactMenu: true,
      showSavings: true,
      confirmCriticalActions: true,
      sessionWarnings: true,
      hideSensitiveData: false,
      blockNegativeStock: true,
      lowStockAlerts: true,
      currentBranchOnly: true,
      showFiscalPending: true,
      prepareChannelSync: true,
      updatedAt: new Date()
    });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/settings/preferences",
      headers: { authorization: `Bearer ${await userToken(["company.read"])}` },
      payload: { darkMode: true }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_companyId_branchId: {
            userId: "user_1",
            companyId: "company_1",
            branchId: "branch_1"
          }
        },
        create: expect.objectContaining({
          userId: "user_1",
          companyId: "company_1",
          branchId: "branch_1",
          darkMode: true
        })
      })
    );
    await app.close();
  });

  it("creates a branch with default warehouse and access for the creator", async () => {
    prismaMock.userBranchAccess.findFirst.mockResolvedValue({ roleId: "role_branch_manager" });
    prismaMock.tx.branch.create.mockResolvedValue({ id: "branch_new", name: "Loja Nova", active: true, createdAt: new Date() });
    prismaMock.tx.warehouse.create.mockResolvedValue({ id: "warehouse_new", name: "Estoque Principal", active: true });
    prismaMock.tx.userBranchAccess.create.mockResolvedValue({ id: "access_new" });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/branches",
      headers: { authorization: `Bearer ${await userToken(["branch.manage"])}` },
      payload: {
        companyId: "company_evil",
        name: "Loja Nova",
        defaultWarehouseName: "Estoque Principal"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.tx.branch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company_1",
          name: "Loja Nova"
        })
      })
    );
    expect(prismaMock.tx.warehouse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company_1",
          branchId: "branch_new",
          name: "Estoque Principal"
        })
      })
    );
    expect(prismaMock.tx.userBranchAccess.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: "user_1",
          branchId: "branch_new",
          roleId: "role_branch_manager"
        }
      })
    );
    await app.close();
  });

  it("updates user access only with roles and branches from authenticated company", async () => {
    const roleId = "cm11111111111111111111111";
    const branchAId = "cm22222222222222222222222";
    const branchBId = "cm33333333333333333333333";
    prismaMock.user.findFirst.mockResolvedValue({
      id: "user_2",
      name: "Operador",
      email: "operador@local.test",
      companyAccesses: [{ roleId: "role_old", active: true }],
      branchAccesses: [{ branchId: "branch_1", roleId: "role_old", active: true }]
    });
    prismaMock.role.findFirst.mockResolvedValue({ id: roleId });
    prismaMock.branch.findMany.mockResolvedValue([{ id: branchAId }, { id: branchBId }]);
    prismaMock.tx.user.findUniqueOrThrow.mockResolvedValue({
      id: "user_2",
      name: "Operador",
      email: "operador@local.test",
      active: true,
      companyAccesses: [{ role: { id: "role_new", name: "Gerente" } }],
      branchAccesses: []
    });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/users/cm12345678901234567890123/access",
      headers: { authorization: `Bearer ${await userToken(["user.manage"])}` },
      payload: {
        roleId,
        branchIds: [branchAId, branchBId]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.role.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: roleId, companyId: "company_1" })
      })
    );
    expect(prismaMock.branch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: [branchAId, branchBId] }, companyId: "company_1", active: true })
      })
    );
    expect(prismaMock.tx.userCompanyAccess.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_2", companyId: "company_1" },
        data: { roleId, active: true }
      })
    );
    expect(prismaMock.tx.userBranchAccess.upsert).toHaveBeenCalledTimes(2);
    await app.close();
  });
});
