import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { createSupplierBodySchema, listQuerySchema, updateSupplierBodySchema } from "@erp/contracts";
import { prisma } from "@erp/database";
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

const supplierSelect = {
  id: true,
  type: true,
  name: true,
  document: true,
  email: true,
  phone: true,
  notes: true,
  active: true,
  createdAt: true,
  updatedAt: true
} as const;

export async function supplierRoutes(app: FastifyInstance) {
  app.get("/api/v1/suppliers", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "supplier.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.supplier.findMany({
      where: {
        companyId: request.tenant!.companyId,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search } },
                { document: { contains: query.search } },
                { email: { contains: query.search } },
                { phone: { contains: query.search } }
              ]
            }
          : {})
      },
      select: supplierSelect,
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.get("/api/v1/suppliers/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "supplier.read");
    const params = parseParams(idParamsSchema, request);
    const supplier = await prisma.supplier.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: supplierSelect
    });

    if (!supplier) {
      throw errors.notFound("SUPPLIER_NOT_FOUND", "Fornecedor não encontrado.");
    }

    return supplier;
  });

  app.post("/api/v1/suppliers", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "supplier.manage");
    const body = parseBody(createSupplierBodySchema, request);
    const supplier = await prisma.supplier.create({
      data: {
        companyId: request.tenant!.companyId,
        type: body.type,
        name: body.name,
        document: body.document ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null
      },
      select: supplierSelect
    });

    await audit(request, { action: "supplier.create", entityType: "Supplier", entityId: supplier.id, after: supplier });
    return reply.status(201).send(supplier);
  });

  app.patch("/api/v1/suppliers/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "supplier.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateSupplierBodySchema, request);
    const existing = await prisma.supplier.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: supplierSelect
    });

    if (!existing) {
      throw errors.notFound("SUPPLIER_NOT_FOUND", "Fornecedor não encontrado.");
    }

    const updated = await prisma.supplier.update({
      where: { id: existing.id },
      data: {
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.document !== undefined ? { document: body.document ?? null } : {}),
        ...(body.email !== undefined ? { email: body.email ?? null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      },
      select: supplierSelect
    });

    await audit(request, { action: "supplier.update", entityType: "Supplier", entityId: updated.id, before: existing, after: updated });
    return updated;
  });
}
