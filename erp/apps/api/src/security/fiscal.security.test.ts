import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@erp/config";
import { signUserAccessToken } from "@erp/security";

class DecimalMock {
  private readonly value: number;

  constructor(value: string | number) {
    this.value = Number(value);
  }

  valueOf() {
    return this.value;
  }
}

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  companyFiscalProfile: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  },
  companyPricingSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  },
  product: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn()
  },
  productFiscalProfile: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  },
  taxRule: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  taxRuleVersion: {
    findFirst: vi.fn(),
    create: vi.fn()
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

describe("fiscal security", () => {
  beforeAll(() => {
    for (const [key, value] of Object.entries(testConfig)) {
      process.env[key] = String(value);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue({ id: "user_1" });
  });

  it("denies fiscal profile update without manage permission", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/fiscal/company-profile",
      headers: { authorization: `Bearer ${await userToken(["fiscal.read"])}` },
      payload: {
        cnpj: "12345678000190",
        taxRegime: "SIMPLES_NACIONAL",
        uf: "MG",
        municipality: "Belo Horizonte"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.companyFiscalProfile.upsert).not.toHaveBeenCalled();
    await app.close();
  });

  it("denies pricing settings update without fiscal.manage permission", async () => {
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/fiscal/pricing-settings",
      headers: { authorization: `Bearer ${await userToken(["fiscal.read"])}` },
      payload: {
        taxPercent: 9.5,
        feePercent: 2.4
      }
    });

    expect(response.statusCode).toBe(403);
    expect(prismaMock.companyPricingSetting.upsert).not.toHaveBeenCalled();
    await app.close();
  });

  it("stores pricing settings scoped by authenticated tenant company", async () => {
    prismaMock.companyPricingSetting.findUnique.mockResolvedValue(null);
    prismaMock.companyPricingSetting.upsert.mockResolvedValue({
      id: "pricing_1",
      companyId: "company_1",
      taxPercent: new DecimalMock(8.75),
      feePercent: new DecimalMock(2.1),
      updatedAt: new Date()
    });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/fiscal/pricing-settings",
      headers: { authorization: `Bearer ${await userToken(["fiscal.manage"])}` },
      payload: {
        companyId: "company_evil",
        taxPercent: 8.75,
        feePercent: 2.1
      }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.companyPricingSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company_1" },
        create: expect.objectContaining({ companyId: "company_1" })
      })
    );
    await app.close();
  });

  it("derives company profile companyId from tenant", async () => {
    prismaMock.companyFiscalProfile.findUnique.mockResolvedValue(null);
    prismaMock.companyFiscalProfile.upsert.mockResolvedValue({ id: "fiscal_profile_1" });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/fiscal/company-profile",
      headers: { authorization: `Bearer ${await userToken(["fiscal.manage"])}` },
      payload: {
        companyId: "company_evil",
        cnpj: "12345678000190",
        taxRegime: "SIMPLES_NACIONAL",
        uf: "MG",
        municipality: "Belo Horizonte"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.companyFiscalProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company_1" },
        create: expect.objectContaining({ companyId: "company_1" })
      })
    );
    await app.close();
  });

  it("does not update fiscal profile for product from another tenant", async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/fiscal/products/cm12345678901234567890123/profile",
      headers: { authorization: `Bearer ${await userToken(["fiscal.manage"])}` },
      payload: {
        ncm: "22021000",
        origin: "NATIONAL",
        fiscalUnit: "UN",
        productType: "MERCHANDISE"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(prismaMock.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "cm12345678901234567890123",
          companyId: "company_1"
        })
      })
    );
    expect(prismaMock.productFiscalProfile.upsert).not.toHaveBeenCalled();
    await app.close();
  });

  it("stores product ICMS, PIS and COFINS classifications in fiscal profile", async () => {
    prismaMock.product.findFirst.mockResolvedValue({ id: "product_1", sku: "SKU-1", name: "Produto", unit: "UN" });
    prismaMock.productFiscalProfile.findUnique.mockResolvedValue(null);
    prismaMock.productFiscalProfile.upsert.mockResolvedValue({ id: "product_fiscal_1" });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/fiscal/products/cm12345678901234567890123/profile",
      headers: { authorization: `Bearer ${await userToken(["fiscal.manage"])}` },
      payload: {
        ncm: "22021000",
        cest: "0300700",
        origin: "NATIONAL",
        fiscalUnit: "UN",
        productType: "MERCHANDISE",
        icmsCst: "00",
        icmsCsosn: "102",
        pisCst: "01",
        cofinsCst: "01"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.productFiscalProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          companyId: "company_1",
          productId: "product_1",
          icmsCst: "00",
          icmsCsosn: "102",
          pisCst: "01",
          cofinsCst: "01"
        }),
        update: expect.objectContaining({
          icmsCst: "00",
          icmsCsosn: "102",
          pisCst: "01",
          cofinsCst: "01"
        })
      })
    );
    await app.close();
  });

  it("creates a new tax rule version instead of updating historical versions", async () => {
    prismaMock.taxRule.findFirst.mockResolvedValue({ id: "tax_rule_1" });
    prismaMock.taxRuleVersion.findFirst.mockResolvedValue({ version: 2 });
    prismaMock.taxRuleVersion.create.mockResolvedValue({ id: "version_3", version: 3 });
    const { buildApp } = await import("../app.js");
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/fiscal/tax-rules/cm12345678901234567890123/versions",
      headers: { authorization: `Bearer ${await userToken(["fiscal.manage"])}` },
      payload: {
        validFrom: "2026-08-16T00:00:00.000Z",
        cfop: "5102",
        icmsRate: "18.0000"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(prismaMock.taxRuleVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taxRuleId: "tax_rule_1",
          version: 3,
          createdBy: "user_1"
        })
      })
    );
    await app.close();
  });
});
