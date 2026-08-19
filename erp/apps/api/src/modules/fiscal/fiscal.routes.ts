import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createTaxRuleBodySchema,
  createTaxRuleVersionBodySchema,
  fiscalPendingQuerySchema,
  listQuerySchema,
  upsertPricingSettingsBodySchema,
  updateTaxRuleBodySchema,
  upsertCompanyFiscalProfileBodySchema,
  upsertProductFiscalProfileBodySchema
} from "@erp/contracts";
import { Prisma, prisma } from "@erp/database";
import { assertPermission, errors } from "@erp/security";
import { parseBody, parseParams, parseQuery } from "../../lib/zod.js";

const idParamsSchema = z.object({ id: z.string().cuid() });
const productParamsSchema = z.object({ productId: z.string().cuid() });

function pagination(query: { limit: number; cursor?: string | undefined }) {
  return {
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
  };
}

function paginated<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return { data, nextCursor: hasMore ? data.at(-1)?.id : null };
}

async function audit(
  request: FastifyRequest,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  }
) {
  const tenant = request.tenant!;
  await prisma.auditLog.create({
    data: {
      companyId: tenant.companyId,
      branchId: tenant.branchId,
      userId: tenant.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before === undefined ? undefined : JSON.parse(JSON.stringify(input.before)),
      after: input.after === undefined ? undefined : JSON.parse(JSON.stringify(input.after)),
      ip: request.ip,
      userAgent: request.headers["user-agent"]?.toString() ?? null,
      correlationId: request.correlationId
    }
  });
}

async function assertProduct(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, active: true },
    select: { id: true, sku: true, name: true, unit: true }
  });

  if (!product) {
    throw errors.notFound("PRODUCT_NOT_FOUND", "Produto não encontrado.");
  }

  return product;
}

const companyFiscalSelect = {
  id: true,
  cnpj: true,
  stateRegistration: true,
  municipalRegistration: true,
  taxRegime: true,
  uf: true,
  municipality: true,
  cnae: true,
  createdAt: true,
  updatedAt: true
} as const;

const productFiscalSelect = {
  id: true,
  productId: true,
  ncm: true,
  cest: true,
  origin: true,
  fiscalUnit: true,
  productType: true,
  icmsCst: true,
  icmsCsosn: true,
  pisCst: true,
  cofinsCst: true,
  createdAt: true,
  updatedAt: true,
  product: { select: { id: true, sku: true, name: true, unit: true } }
} as const;

const taxRuleSelect = {
  id: true,
  name: true,
  description: true,
  taxType: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  conditions: {
    select: { id: true, field: true, operator: true, value: true },
    orderBy: { createdAt: "asc" as const }
  },
  versions: {
    select: {
      id: true,
      version: true,
      validFrom: true,
      validUntil: true,
      cfop: true,
      cst: true,
      csosn: true,
      icmsRate: true,
      pisRate: true,
      cofinsRate: true,
      ibsRate: true,
      cbsRate: true,
      additionalData: true,
      createdAt: true
    },
    orderBy: { version: "desc" as const },
    take: 5
  }
} as const;

const pricingSettingsSelect = {
  id: true,
  companyId: true,
  taxPercent: true,
  feePercent: true,
  updatedAt: true
} as const;

export async function fiscalRoutes(app: FastifyInstance) {
  app.get("/api/v1/fiscal/pricing-settings", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "fiscal.read");
    const settings = await prisma.companyPricingSetting.findUnique({
      where: { companyId: request.tenant!.companyId },
      select: pricingSettingsSelect
    });

    if (settings) {
      return settings;
    }

    return {
      id: null,
      companyId: request.tenant!.companyId,
      taxPercent: new Prisma.Decimal("6.00"),
      feePercent: new Prisma.Decimal("3.00"),
      updatedAt: null
    };
  });

  app.put("/api/v1/fiscal/pricing-settings", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "fiscal.manage");
    const body = parseBody(upsertPricingSettingsBodySchema, request);

    const before = await prisma.companyPricingSetting.findUnique({
      where: { companyId: request.tenant!.companyId },
      select: pricingSettingsSelect
    });

    const settings = await prisma.companyPricingSetting.upsert({
      where: { companyId: request.tenant!.companyId },
      create: {
        companyId: request.tenant!.companyId,
        taxPercent: new Prisma.Decimal(body.taxPercent),
        feePercent: new Prisma.Decimal(body.feePercent)
      },
      update: {
        taxPercent: new Prisma.Decimal(body.taxPercent),
        feePercent: new Prisma.Decimal(body.feePercent)
      },
      select: pricingSettingsSelect
    });

    await audit(request, {
      action: before ? "fiscal.pricing_settings.update" : "fiscal.pricing_settings.create",
      entityType: "CompanyPricingSetting",
      entityId: settings.id,
      before,
      after: settings
    });

    return settings;
  });

  app.get("/api/v1/fiscal/company-profile", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "fiscal.read");
    return prisma.companyFiscalProfile.findUnique({
      where: { companyId: request.tenant!.companyId },
      select: companyFiscalSelect
    });
  });

  app.put("/api/v1/fiscal/company-profile", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "fiscal.manage");
    const body = parseBody(upsertCompanyFiscalProfileBodySchema, request);
    const before = await prisma.companyFiscalProfile.findUnique({
      where: { companyId: request.tenant!.companyId },
      select: companyFiscalSelect
    });
    const profile = await prisma.companyFiscalProfile.upsert({
      where: { companyId: request.tenant!.companyId },
      create: {
        companyId: request.tenant!.companyId,
        cnpj: body.cnpj,
        stateRegistration: body.stateRegistration ?? null,
        municipalRegistration: body.municipalRegistration ?? null,
        taxRegime: body.taxRegime,
        uf: body.uf,
        municipality: body.municipality,
        cnae: body.cnae ?? null
      },
      update: {
        cnpj: body.cnpj,
        stateRegistration: body.stateRegistration ?? null,
        municipalRegistration: body.municipalRegistration ?? null,
        taxRegime: body.taxRegime,
        uf: body.uf,
        municipality: body.municipality,
        cnae: body.cnae ?? null
      },
      select: companyFiscalSelect
    });

    await audit(request, {
      action: before ? "fiscal.company_profile.update" : "fiscal.company_profile.create",
      entityType: "CompanyFiscalProfile",
      entityId: profile.id,
      before,
      after: profile
    });
    return profile;
  });

  app.get("/api/v1/fiscal/products/:productId/profile", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "fiscal.read");
    const params = parseParams(productParamsSchema, request);
    await assertProduct(request.tenant!.companyId, params.productId);
    return prisma.productFiscalProfile.findUnique({
      where: { productId: params.productId },
      select: productFiscalSelect
    });
  });

  app.put("/api/v1/fiscal/products/:productId/profile", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "fiscal.manage");
    const params = parseParams(productParamsSchema, request);
    const body = parseBody(upsertProductFiscalProfileBodySchema, request);
    const product = await assertProduct(request.tenant!.companyId, params.productId);
    const before = await prisma.productFiscalProfile.findUnique({
      where: { productId: product.id },
      select: productFiscalSelect
    });
    const profile = await prisma.productFiscalProfile.upsert({
      where: { productId: product.id },
      create: {
        companyId: request.tenant!.companyId,
        productId: product.id,
        ncm: body.ncm ?? null,
        cest: body.cest ?? null,
        origin: body.origin,
        fiscalUnit: body.fiscalUnit,
        productType: body.productType,
        icmsCst: body.icmsCst ?? null,
        icmsCsosn: body.icmsCsosn ?? null,
        pisCst: body.pisCst ?? null,
        cofinsCst: body.cofinsCst ?? null
      },
      update: {
        ncm: body.ncm ?? null,
        cest: body.cest ?? null,
        origin: body.origin,
        fiscalUnit: body.fiscalUnit,
        productType: body.productType,
        icmsCst: body.icmsCst ?? null,
        icmsCsosn: body.icmsCsosn ?? null,
        pisCst: body.pisCst ?? null,
        cofinsCst: body.cofinsCst ?? null
      },
      select: productFiscalSelect
    });

    await audit(request, {
      action: before ? "fiscal.product_profile.update" : "fiscal.product_profile.create",
      entityType: "ProductFiscalProfile",
      entityId: profile.id,
      before,
      after: profile
    });
    return profile;
  });

  app.get("/api/v1/fiscal/pending-products", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "fiscal.read");
    const query = parseQuery(fiscalPendingQuerySchema, request);
    const missingProfileWhere = { companyId: request.tenant!.companyId, active: true, fiscalProfile: null };
    const missingNcmWhere = {
      companyId: request.tenant!.companyId,
      active: true,
      fiscalProfile: { is: { ncm: null } }
    };

    const where =
      query.reason === "MISSING_PROFILE"
        ? missingProfileWhere
        : query.reason === "MISSING_NCM"
          ? missingNcmWhere
          : {
              companyId: request.tenant!.companyId,
              active: true,
              OR: [{ fiscalProfile: null }, { fiscalProfile: { is: { ncm: null } } }]
            };

    const [items, missingProfile, missingNcm] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          unit: true,
          fiscalProfile: { select: { id: true, ncm: true, cest: true, productType: true, icmsCst: true, icmsCsosn: true, pisCst: true, cofinsCst: true } }
        },
        orderBy: { createdAt: "desc" },
        ...pagination(query)
      }),
      prisma.product.count({ where: missingProfileWhere }),
      prisma.product.count({ where: missingNcmWhere })
    ]);

    return {
      ...paginated(
        items.map((item) => ({
          ...item,
          reasons: [
            ...(item.fiscalProfile ? [] : ["MISSING_PROFILE" as const]),
            ...(item.fiscalProfile?.ncm ? [] : ["MISSING_NCM" as const]),
            ...(item.fiscalProfile?.icmsCst || item.fiscalProfile?.icmsCsosn ? [] : ["MISSING_ICMS_CLASSIFICATION" as const]),
            ...(item.fiscalProfile?.pisCst ? [] : ["MISSING_PIS_CST" as const]),
            ...(item.fiscalProfile?.cofinsCst ? [] : ["MISSING_COFINS_CST" as const])
          ]
        })),
        query.limit
      ),
      summary: {
        missingProfile,
        missingNcm,
        missingTaxRule: 0
      }
    };
  });

  app.get("/api/v1/fiscal/tax-rules", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "fiscal.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.taxRule.findMany({
      where: {
        companyId: request.tenant!.companyId,
        ...(query.search ? { name: { contains: query.search } } : {})
      },
      select: taxRuleSelect,
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/fiscal/tax-rules", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "fiscal.manage");
    const body = parseBody(createTaxRuleBodySchema, request);
    const rule = await prisma.taxRule.create({
      data: {
        companyId: request.tenant!.companyId,
        name: body.name,
        description: body.description ?? null,
        taxType: body.taxType,
        conditions: {
          create: body.conditions.map((condition) => ({
            field: condition.field,
            operator: condition.operator,
            value: condition.value
          }))
        }
      },
      select: taxRuleSelect
    });

    await audit(request, { action: "fiscal.tax_rule.create", entityType: "TaxRule", entityId: rule.id, after: rule });
    return reply.status(201).send(rule);
  });

  app.patch("/api/v1/fiscal/tax-rules/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "fiscal.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateTaxRuleBodySchema, request);
    const before = await prisma.taxRule.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: taxRuleSelect
    });

    if (!before) {
      throw errors.notFound("TAX_RULE_NOT_FOUND", "Regra fiscal não encontrada.");
    }

    const rule = await prisma.taxRule.update({
      where: { id: before.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      },
      select: taxRuleSelect
    });

    await audit(request, { action: "fiscal.tax_rule.update", entityType: "TaxRule", entityId: rule.id, before, after: rule });
    return rule;
  });

  app.post("/api/v1/fiscal/tax-rules/:id/versions", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "fiscal.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(createTaxRuleVersionBodySchema, request);
    const rule = await prisma.taxRule.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true }
    });

    if (!rule) {
      throw errors.notFound("TAX_RULE_NOT_FOUND", "Regra fiscal não encontrada.");
    }

    const latest = await prisma.taxRuleVersion.findFirst({
      where: { taxRuleId: rule.id },
      select: { version: true },
      orderBy: { version: "desc" }
    });

    const version = await prisma.taxRuleVersion.create({
      data: {
        taxRuleId: rule.id,
        version: (latest?.version ?? 0) + 1,
        validFrom: body.validFrom,
        validUntil: body.validUntil ?? null,
        cfop: body.cfop ?? null,
        cst: body.cst ?? null,
        csosn: body.csosn ?? null,
        icmsRate: body.icmsRate ? new Prisma.Decimal(body.icmsRate) : null,
        pisRate: body.pisRate ? new Prisma.Decimal(body.pisRate) : null,
        cofinsRate: body.cofinsRate ? new Prisma.Decimal(body.cofinsRate) : null,
        ibsRate: body.ibsRate ? new Prisma.Decimal(body.ibsRate) : null,
        cbsRate: body.cbsRate ? new Prisma.Decimal(body.cbsRate) : null,
        ...(body.additionalData === undefined ? {} : { additionalData: body.additionalData as Prisma.InputJsonValue }),
        createdBy: request.tenant!.userId
      },
      select: {
        id: true,
        version: true,
        validFrom: true,
        validUntil: true,
        cfop: true,
        cst: true,
        csosn: true,
        icmsRate: true,
        pisRate: true,
        cofinsRate: true,
        ibsRate: true,
        cbsRate: true,
        additionalData: true,
        createdAt: true
      }
    });

    await audit(request, { action: "fiscal.tax_rule_version.create", entityType: "TaxRuleVersion", entityId: version.id, after: version });
    return reply.status(201).send(version);
  });
}
