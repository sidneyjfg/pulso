import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@erp/config";
import { signAdminAccessToken, signUserAccessToken } from "@erp/security";

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  product: { findFirst: vi.fn(), update: vi.fn() }
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

const allUserPermissions = [
  "product.read",
  "product.create",
  "product.update",
  "product.delete",
  "inventory.read",
  "inventory.adjust",
  "inventory.transfer",
  "sale.read",
  "sale.create",
  "sale.cancel",
  "purchase.read",
  "purchase.create",
  "purchase.receive",
  "customer.read",
  "customer.manage",
  "supplier.read",
  "supplier.manage",
  "company.read",
  "company.manage",
  "branch.read",
  "branch.manage",
  "user.read",
  "user.manage",
  "integration.read",
  "integration.manage",
  "fiscal.read",
  "fiscal.manage"
] as const;

type PermissionCase = {
  requiredPermission: (typeof allUserPermissions)[number];
  method: "GET" | "POST" | "PATCH" | "PUT";
  url: string;
  payload?: Record<string, unknown>;
};

const permissionCases: PermissionCase[] = [
  { requiredPermission: "product.read", method: "GET", url: "/api/v1/products" },
  { requiredPermission: "product.create", method: "POST", url: "/api/v1/products", payload: {} },
  { requiredPermission: "product.update", method: "PATCH", url: "/api/v1/products/cm12345678901234567890123", payload: {} },
  { requiredPermission: "inventory.read", method: "GET", url: "/api/v1/inventory/balances" },
  { requiredPermission: "inventory.adjust", method: "POST", url: "/api/v1/inventory/adjustments", payload: {} },
  { requiredPermission: "inventory.transfer", method: "POST", url: "/api/v1/inventory/transfers", payload: {} },
  { requiredPermission: "sale.read", method: "GET", url: "/api/v1/sales" },
  { requiredPermission: "sale.create", method: "POST", url: "/api/v1/sales", payload: {} },
  { requiredPermission: "sale.cancel", method: "POST", url: "/api/v1/sales/cm12345678901234567890123/cancel", payload: {} },
  { requiredPermission: "purchase.read", method: "GET", url: "/api/v1/purchases" },
  { requiredPermission: "purchase.create", method: "POST", url: "/api/v1/purchases", payload: {} },
  { requiredPermission: "purchase.receive", method: "POST", url: "/api/v1/purchases/cm12345678901234567890123/receive", payload: {} },
  { requiredPermission: "customer.read", method: "GET", url: "/api/v1/customers" },
  { requiredPermission: "customer.manage", method: "POST", url: "/api/v1/customers", payload: {} },
  { requiredPermission: "supplier.read", method: "GET", url: "/api/v1/suppliers" },
  { requiredPermission: "supplier.manage", method: "POST", url: "/api/v1/suppliers", payload: {} },
  { requiredPermission: "company.read", method: "GET", url: "/api/v1/companies" },
  { requiredPermission: "company.manage", method: "POST", url: "/api/v1/companies", payload: {} },
  { requiredPermission: "branch.read", method: "GET", url: "/api/v1/branches" },
  { requiredPermission: "branch.manage", method: "POST", url: "/api/v1/branches", payload: {} },
  { requiredPermission: "user.read", method: "GET", url: "/api/v1/users" },
  { requiredPermission: "user.manage", method: "POST", url: "/api/v1/users", payload: {} },
  { requiredPermission: "integration.read", method: "GET", url: "/api/v1/integrations/connections" },
  { requiredPermission: "integration.manage", method: "POST", url: "/api/v1/integrations/connections", payload: {} },
  { requiredPermission: "fiscal.read", method: "GET", url: "/api/v1/fiscal/company-profile" },
  { requiredPermission: "fiscal.manage", method: "PUT", url: "/api/v1/fiscal/company-profile", payload: {} }
];

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

describe("permissions matrix security", () => {
  let app: Awaited<ReturnType<typeof import("../app.js")["buildApp"]>>;

  beforeAll(async () => {
    for (const [key, value] of Object.entries(testConfig)) {
      process.env[key] = String(value);
    }
    const { buildApp } = await import("../app.js");
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue({ id: "user_1" });
  });

  for (const testCase of permissionCases) {
    it(`denies ${testCase.method} ${testCase.url} without ${testCase.requiredPermission}`, async () => {
      const permissions = allUserPermissions.filter((permission) => permission !== testCase.requiredPermission);
      const token = await userToken(permissions);

      const response = await app.inject({
        method: testCase.method,
        url: testCase.url,
        headers: { authorization: `Bearer ${token}` },
        ...(testCase.payload ? { payload: testCase.payload } : {})
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ code: "FORBIDDEN" });
    });
  }

  it("denies admin endpoint when ADMIN token lacks platform.admin", async () => {
    const token = await signAdminAccessToken(testConfig, {
      tokenType: "ADMIN_ACCESS",
      userId: "admin_1",
      sessionId: "session_admin_1",
      permissions: []
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/me",
      headers: { authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not grant product update with product.delete alone", async () => {
    const token = await userToken(["product.delete"]);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/products/cm12345678901234567890123",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Produto sem permissão de update" }
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.product.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });
});
