import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  adminCreateOrganizationBodySchema,
  adminUpdateOrganizationBodySchema,
  listQuerySchema
} from "@erp/contracts";
import { prisma } from "@erp/database";
import { errors } from "@erp/security";
import { parseBody, parseParams, parseQuery } from "../../lib/zod.js";

const idParamsSchema = z.object({
  id: z.string().cuid()
});

function pagination(query: { limit: number; cursor?: string | undefined }) {
  return {
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
  };
}

function paginated<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return {
    data,
    nextCursor: hasMore ? data.at(-1)?.id : null
  };
}

async function auditAdmin(request: FastifyRequest, input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: request.admin!.userId,
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

export async function adminRoutes(app: FastifyInstance) {
  app.get("/api/admin/me", { preHandler: [app.authenticateAdmin] }, async (request) => ({
    userId: request.admin!.userId,
    permissions: request.admin!.permissions
  }));

  app.get("/api/admin/organizations", { preHandler: [app.authenticateAdmin] }, async (request) => {
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.organization.findMany({
      where: {
        ...(query.search ? { name: { contains: query.search } } : {})
      },
      select: {
        id: true,
        name: true,
        active: true,
        createdAt: true,
        _count: {
          select: { companies: true, users: true }
        }
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/admin/organizations", { preHandler: [app.authenticateAdmin] }, async (request, reply) => {
    const body = parseBody(adminCreateOrganizationBodySchema, request);
    const organization = await prisma.organization.create({
      data: { name: body.name },
      select: { id: true, name: true, active: true, createdAt: true }
    });

    await auditAdmin(request, {
      action: "platform.organization.create",
      entityType: "Organization",
      entityId: organization.id,
      after: organization
    });

    return reply.status(201).send(organization);
  });

  app.patch("/api/admin/organizations/:id", { preHandler: [app.authenticateAdmin] }, async (request) => {
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(adminUpdateOrganizationBodySchema, request);
    const existing = await prisma.organization.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, active: true }
    });

    if (!existing) {
      throw errors.notFound("ORGANIZATION_NOT_FOUND", "Organização não encontrada.");
    }

    const updated = await prisma.organization.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      },
      select: { id: true, name: true, active: true }
    });

    await auditAdmin(request, {
      action: "platform.organization.update",
      entityType: "Organization",
      entityId: updated.id,
      before: existing,
      after: updated
    });

    return updated;
  });

  app.get("/api/admin/companies", { preHandler: [app.authenticateAdmin] }, async (request) => {
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.company.findMany({
      where: {
        ...(query.search
          ? {
              OR: [
                { legalName: { contains: query.search } },
                { tradeName: { contains: query.search } },
                { cnpj: { contains: query.search } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        cnpj: true,
        active: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
        _count: { select: { branches: true, users: true } }
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });
}
