import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@erp/config";
import { signAdminAccessToken, signUserAccessToken } from "@erp/security";

const prismaMock = vi.hoisted(() => {
  const tx = {
    permission: {
      createMany: vi.fn(),
      findMany: vi.fn()
    },
    organization: {
      create: vi.fn()
    },
    company: {
      create: vi.fn()
    },
    branch: {
      create: vi.fn()
    },
    warehouse: {
      create: vi.fn()
    },
    role: {
      create: vi.fn()
    },
    rolePermission: {
      createMany: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    userOrganizationAccess: {
      create: vi.fn()
    },
    userCompanyAccess: {
      create: vi.fn()
    },
    userBranchAccess: {
      create: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  };

  type TxMock = typeof tx;

  return {
    tx,
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn()
    },
    session: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn()
    },
    refreshToken: {
      create: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    },
    $transaction: vi.fn(async (callback: (tx: TxMock) => unknown) => callback(tx))
  };
});

vi.mock("@erp/database", () => ({
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

describe("auth security", () => {
  beforeAll(() => {
    for (const [key, value] of Object.entries(testConfig)) {
      process.env[key] = String(value);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock.tx));
  });

  it("rejects requests without token", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/me" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
    await app.close();
  });

  it("rejects USER_ACCESS token on admin endpoints", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await signUserAccessToken(testConfig, {
      tokenType: "USER_ACCESS",
      userId: "user_1",
      sessionId: "session_1",
      organizationId: "org_1",
      companyId: "company_1",
      branchId: "branch_1",
      role: "Admin",
      permissions: ["company.read"]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/me",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
    await app.close();
  });

  it("rejects ADMIN_ACCESS token on user endpoints", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await signAdminAccessToken(testConfig, {
      tokenType: "ADMIN_ACCESS",
      userId: "user_1",
      sessionId: "session_1",
      permissions: ["platform.admin"]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
    await app.close();
  });

  it("rejects valid user token when database access no longer exists", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await signUserAccessToken(testConfig, {
      tokenType: "USER_ACCESS",
      userId: "user_1",
      sessionId: "session_1",
      organizationId: "org_1",
      companyId: "company_1",
      branchId: "branch_1",
      role: "Admin",
      permissions: ["company.read"]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "INVALID_TENANT" });
    await app.close();
  });

  it("rejects valid admin token when platform access is missing in database", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const token = await signAdminAccessToken(testConfig, {
      tokenType: "ADMIN_ACCESS",
      userId: "user_1",
      sessionId: "session_1",
      permissions: ["platform.admin"]
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/me",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "FORBIDDEN" });
    await app.close();
  });

  it("registers a tenant without trusting sensitive frontend fields", async () => {
    const permissions = Array.from({ length: 27 }, (_, index) => ({ id: `permission_${index}` }));
    const rolePermissions = permissions.map((permission) => ({ permission: { key: permission.id } }));

    prismaMock.tx.user.findUnique.mockResolvedValue(null);
    prismaMock.tx.permission.findMany.mockResolvedValue(permissions);
    prismaMock.tx.organization.create.mockResolvedValue({ id: "org_created" });
    prismaMock.tx.company.create.mockResolvedValue({ id: "company_created" });
    prismaMock.tx.branch.create.mockResolvedValue({ id: "branch_created" });
    prismaMock.tx.warehouse.create.mockResolvedValue({ id: "warehouse_created" });
    prismaMock.tx.role.create.mockResolvedValue({ id: "role_created" });
    prismaMock.tx.user.create.mockResolvedValue({ id: "user_created" });
    prismaMock.session.create.mockResolvedValue({ id: "session_created" });
    prismaMock.user.findFirst.mockResolvedValue({
      organizationAccesses: [
        {
          organizationId: "org_created",
          role: { name: "Administrador", permissions: rolePermissions }
        }
      ],
      companyAccesses: [
        {
          companyId: "company_created",
          company: { organizationId: "org_created", active: true },
          role: { name: "Administrador", permissions: rolePermissions }
        }
      ],
      branchAccesses: [
        {
          branchId: "branch_created",
          branch: { companyId: "company_created", active: true },
          role: { name: "Administrador", permissions: rolePermissions }
        }
      ]
    });

    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        name: "Dono da Loja",
        email: "dono@loja.test",
        password: "SenhaForte123",
        companyName: "Mercado Pulso",
        branchName: "Loja Centro",
        companyId: "company_attacker",
        branchId: "branch_attacker",
        role: "PLATFORM_ADMIN",
        permissions: ["platform.admin"]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      tenant: {
        organizationId: "org_created",
        companyId: "company_created",
        branchId: "branch_created"
      }
    });
    expect(response.json()).not.toHaveProperty("refreshToken");
    expect(response.headers["set-cookie"]).toContain("pulso_refresh=");
    expect(response.headers["set-cookie"]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]).toContain("SameSite=Lax");
    expect(prismaMock.tx.company.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_created",
          legalName: "Mercado Pulso",
          tradeName: "Mercado Pulso"
        })
      })
    );
    expect(prismaMock.tx.branch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          companyId: "company_created",
          name: "Loja Centro"
        }
      })
    );
    expect(prismaMock.tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          companyId: "company_attacker",
          branchId: "branch_attacker",
          role: "PLATFORM_ADMIN",
          permissions: ["platform.admin"]
        })
      })
    );
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_created",
          sessionId: "session_created"
        })
      })
    );
    await app.close();
  });

  it("rejects public registration with duplicated email", async () => {
    prismaMock.tx.user.findUnique.mockResolvedValue({ id: "existing_user" });

    const { buildApp } = await import("../app.js");
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        name: "Dono da Loja",
        email: "dono@loja.test",
        password: "SenhaForte123",
        companyName: "Mercado Pulso",
        branchName: "Loja Centro"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "USER_ALREADY_EXISTS" });
    expect(prismaMock.tx.company.create).not.toHaveBeenCalled();
    expect(prismaMock.session.create).not.toHaveBeenCalled();
    await app.close();
  });
});
