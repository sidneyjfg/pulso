import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createAlertRuleBodySchema,
  createImportJobBodySchema,
  createIntegrationConnectionBodySchema,
  createReportJobBodySchema,
  listQuerySchema,
  updateAlertRuleBodySchema,
  updateIntegrationConnectionBodySchema
} from "@erp/contracts";
import { Prisma, prisma } from "@erp/database";
import { assertPermission, errors } from "@erp/security";
import { parseBody, parseParams, parseQuery } from "../../lib/zod.js";

const idParamsSchema = z.object({ id: z.string().cuid() });

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

async function assertBranch(companyId: string, branchId: string | undefined) {
  if (!branchId) {
    return null;
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId, active: true },
    select: { id: true }
  });

  if (!branch) {
    throw errors.notFound("BRANCH_NOT_FOUND", "Loja não encontrada.");
  }

  return branch;
}

export async function growthRoutes(app: FastifyInstance) {
  app.get("/api/v1/alerts", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.alert.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }],
        ...(query.search
          ? {
              OR: [
                { branchId: request.tenant!.branchId, title: { contains: query.search } },
                { branchId: request.tenant!.branchId, message: { contains: query.search } },
                { branchId: null, title: { contains: query.search } },
                { branchId: null, message: { contains: query.search } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        title: true,
        message: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        resolvedAt: true
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.get("/api/v1/alerts/rules", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.alertRule.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }],
        ...(query.search ? { name: { contains: query.search } } : {})
      },
      select: { id: true, type: true, name: true, active: true, threshold: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/alerts/rules", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "inventory.adjust");
    const body = parseBody(createAlertRuleBodySchema, request);
    await assertBranch(request.tenant!.companyId, body.branchId);

    const rule = await prisma.alertRule.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: body.branchId ?? request.tenant!.branchId,
        type: body.type,
        name: body.name,
        ...(body.threshold !== undefined ? { threshold: body.threshold as Prisma.InputJsonValue } : {}),
        createdBy: request.tenant!.userId
      },
      select: { id: true, type: true, name: true, active: true, threshold: true, createdAt: true }
    });

    await audit(request, { action: "alert_rule.create", entityType: "AlertRule", entityId: rule.id, after: rule });
    return reply.status(201).send(rule);
  });

  app.patch("/api/v1/alerts/rules/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "inventory.adjust");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateAlertRuleBodySchema, request);
    await assertBranch(request.tenant!.companyId, body.branchId);

    const before = await prisma.alertRule.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true, type: true, name: true, active: true, threshold: true, branchId: true }
    });

    if (!before) {
      throw errors.notFound("ALERT_RULE_NOT_FOUND", "Regra de alerta não encontrada.");
    }

    const rule = await prisma.alertRule.update({
      where: { id: before.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.branchId !== undefined ? { branchId: body.branchId } : {}),
        ...(body.threshold !== undefined ? { threshold: body.threshold as Prisma.InputJsonValue } : {})
      },
      select: { id: true, type: true, name: true, active: true, threshold: true, createdAt: true, updatedAt: true }
    });

    await audit(request, { action: "alert_rule.update", entityType: "AlertRule", entityId: rule.id, before, after: rule });
    return rule;
  });

  app.get("/api/v1/imports/jobs", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "product.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.importJob.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }],
        ...(query.search ? { fileName: { contains: query.search } } : {})
      },
      select: { id: true, source: true, status: true, fileName: true, totalRows: true, validRows: true, invalidRows: true, summary: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/imports/jobs", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "product.create");
    const body = parseBody(createImportJobBodySchema, request);
    await assertBranch(request.tenant!.companyId, body.branchId);

    const job = await prisma.importJob.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: body.branchId ?? request.tenant!.branchId,
        source: body.source,
        fileName: body.fileName ?? null,
        createdBy: request.tenant!.userId
      },
      select: { id: true, source: true, status: true, fileName: true, totalRows: true, validRows: true, invalidRows: true, createdAt: true }
    });

    await audit(request, { action: "import_job.create", entityType: "ImportJob", entityId: job.id, after: job });
    return reply.status(201).send(job);
  });

  app.get("/api/v1/integrations/connections", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.integrationConnection.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }],
        ...(query.search ? { externalAccountId: { contains: query.search } } : {})
      },
      select: { id: true, channel: true, status: true, externalAccountId: true, connectedAt: true, lastSyncAt: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/integrations/connections", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "integration.manage");
    const body = parseBody(createIntegrationConnectionBodySchema, request);
    await assertBranch(request.tenant!.companyId, body.branchId);

    const connection = await prisma.integrationConnection.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: body.branchId ?? request.tenant!.branchId,
        channel: body.channel,
        externalAccountId: body.externalAccountId ?? null,
        createdBy: request.tenant!.userId
      },
      select: { id: true, channel: true, status: true, externalAccountId: true, connectedAt: true, lastSyncAt: true, createdAt: true }
    });

    await audit(request, { action: "integration_connection.create", entityType: "IntegrationConnection", entityId: connection.id, after: connection });
    return reply.status(201).send(connection);
  });

  app.patch("/api/v1/integrations/connections/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "integration.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateIntegrationConnectionBodySchema, request);
    const before = await prisma.integrationConnection.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true, channel: true, status: true, externalAccountId: true }
    });

    if (!before) {
      throw errors.notFound("INTEGRATION_CONNECTION_NOT_FOUND", "Conexão não encontrada.");
    }

    const connection = await prisma.integrationConnection.update({
      where: { id: before.id },
      data: {
        status: body.status,
        ...(body.externalAccountId !== undefined ? { externalAccountId: body.externalAccountId } : {}),
        ...(body.status === "CONNECTED" ? { connectedAt: new Date() } : {})
      },
      select: { id: true, channel: true, status: true, externalAccountId: true, connectedAt: true, lastSyncAt: true, updatedAt: true }
    });

    await audit(request, { action: "integration_connection.update", entityType: "IntegrationConnection", entityId: connection.id, before, after: connection });
    return connection;
  });

  app.get("/api/v1/reports/jobs", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "sale.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.reportJob.findMany({
      where: {
        companyId: request.tenant!.companyId,
        OR: [{ branchId: request.tenant!.branchId }, { branchId: null }]
      },
      select: { id: true, type: true, status: true, filters: true, resultSummary: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/reports/jobs", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "sale.read");
    const body = parseBody(createReportJobBodySchema, request);
    await assertBranch(request.tenant!.companyId, body.branchId);

    const job = await prisma.reportJob.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: body.branchId ?? request.tenant!.branchId,
        type: body.type,
        ...(body.filters !== undefined ? { filters: body.filters as Prisma.InputJsonValue } : {}),
        createdBy: request.tenant!.userId
      },
      select: { id: true, type: true, status: true, filters: true, resultSummary: true, createdAt: true }
    });

    await audit(request, { action: "report_job.create", entityType: "ReportJob", entityId: job.id, after: job });
    return reply.status(201).send(job);
  });

  app.get("/api/v1/search", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "company.read");
    const query = parseQuery(listQuerySchema, request);
    if (!query.search) {
      return { data: [], nextCursor: null };
    }

    const take = Math.min(query.limit, 25);
    const [products, customers, suppliers, sales] = await Promise.all([
      prisma.product.findMany({
        where: {
          companyId: request.tenant!.companyId,
          active: true,
          OR: [{ name: { contains: query.search } }, { sku: { contains: query.search } }, { barcodes: { some: { barcode: { contains: query.search } } } }]
        },
        select: { id: true, sku: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take
      }),
      prisma.customer.findMany({
        where: {
          companyId: request.tenant!.companyId,
          active: true,
          OR: [{ name: { contains: query.search } }, { document: { contains: query.search } }, { email: { contains: query.search } }]
        },
        select: { id: true, name: true, document: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take
      }),
      prisma.supplier.findMany({
        where: {
          companyId: request.tenant!.companyId,
          active: true,
          OR: [{ name: { contains: query.search } }, { document: { contains: query.search } }, { email: { contains: query.search } }]
        },
        select: { id: true, name: true, document: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take
      }),
      prisma.sale.findMany({
        where: {
          companyId: request.tenant!.companyId,
          branchId: request.tenant!.branchId,
          customer: { name: { contains: query.search } }
        },
        select: { id: true, total: true, status: true, source: true, createdAt: true, customer: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take
      })
    ]);

    const data = [
      ...products.map((item) => ({ ...item, resultType: "Produto", subtitle: item.sku })),
      ...customers.map((item) => ({ ...item, resultType: "Cliente", subtitle: item.document ?? item.email })),
      ...suppliers.map((item) => ({ ...item, resultType: "Fornecedor", subtitle: item.document ?? item.email })),
      ...sales.map((item) => ({ ...item, resultType: "Venda", name: item.customer?.name ?? "Venda sem cliente", subtitle: item.source }))
    ].slice(0, query.limit);

    return { data, nextCursor: null };
  });
}
