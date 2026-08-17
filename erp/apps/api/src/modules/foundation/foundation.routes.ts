import argon2 from "argon2";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createBranchBodySchema,
  createCompanyBodySchema,
  createRoleBodySchema,
  createUserBodySchema,
  createWarehouseBodySchema,
  listQuerySchema,
  updateBranchBodySchema,
  updateCompanyBodySchema,
  updateUserAccessBodySchema,
  updateUserPreferencesBodySchema,
  updateUserStatusBodySchema,
  updateWarehouseBodySchema
} from "@erp/contracts";
import { prisma } from "@erp/database";
import { assertPermission, errors } from "@erp/security";
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

const preferenceKeys = [
  "darkMode",
  "compactMenu",
  "showSavings",
  "confirmCriticalActions",
  "sessionWarnings",
  "hideSensitiveData",
  "blockNegativeStock",
  "lowStockAlerts",
  "currentBranchOnly",
  "showFiscalPending",
  "prepareChannelSync"
] as const;

function preferenceData(body: Partial<Record<(typeof preferenceKeys)[number], boolean | undefined>>) {
  return Object.fromEntries(
    preferenceKeys.flatMap((key) => (body[key] === undefined ? [] : [[key, body[key]]]))
  );
}

async function audit(request: FastifyRequest, input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
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

export async function foundationRoutes(app: FastifyInstance) {
  app.get("/api/v1/me", { preHandler: [app.authenticateUser] }, async (request) => {
    const tenant = request.tenant!;
    const user = await prisma.user.findFirst({
      where: { id: tenant.userId, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        organizationAccesses: {
          where: { active: true },
          select: { organization: { select: { id: true, name: true } } }
        },
        companyAccesses: {
          where: { active: true },
          select: { company: { select: { id: true, legalName: true, tradeName: true, organizationId: true } } }
        },
        branchAccesses: {
          where: { active: true },
          select: { branch: { select: { id: true, name: true, companyId: true } } }
        }
      }
    });

    if (!user) {
      throw errors.unauthorized();
    }

    return { user, tenant };
  });

  app.get("/api/v1/settings/preferences", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "company.read");
    const tenant = request.tenant!;
    const preferences = await prisma.userPreference.upsert({
      where: {
        userId_companyId_branchId: {
          userId: tenant.userId,
          companyId: tenant.companyId,
          branchId: tenant.branchId
        }
      },
      create: {
        userId: tenant.userId,
        companyId: tenant.companyId,
        branchId: tenant.branchId
      },
      update: {},
      select: {
        darkMode: true,
        compactMenu: true,
        showSavings: true,
        confirmCriticalActions: true,
        sessionWarnings: true,
        hideSensitiveData: true,
        blockNegativeStock: true,
        lowStockAlerts: true,
        currentBranchOnly: true,
        showFiscalPending: true,
        prepareChannelSync: true,
        updatedAt: true
      }
    });

    return preferences;
  });

  app.patch("/api/v1/settings/preferences", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "company.read");
    const tenant = request.tenant!;
    const body = parseBody(updateUserPreferencesBodySchema, request);
    const data = preferenceData(body);

    const before = await prisma.userPreference.findUnique({
      where: {
        userId_companyId_branchId: {
          userId: tenant.userId,
          companyId: tenant.companyId,
          branchId: tenant.branchId
        }
      }
    });

    const preferences = await prisma.userPreference.upsert({
      where: {
        userId_companyId_branchId: {
          userId: tenant.userId,
          companyId: tenant.companyId,
          branchId: tenant.branchId
        }
      },
      create: {
        userId: tenant.userId,
        companyId: tenant.companyId,
        branchId: tenant.branchId,
        ...data
      },
      update: data,
      select: {
        darkMode: true,
        compactMenu: true,
        showSavings: true,
        confirmCriticalActions: true,
        sessionWarnings: true,
        hideSensitiveData: true,
        blockNegativeStock: true,
        lowStockAlerts: true,
        currentBranchOnly: true,
        showFiscalPending: true,
        prepareChannelSync: true,
        updatedAt: true
      }
    });

    const sensitiveKeys = ["confirmCriticalActions", "hideSensitiveData", "blockNegativeStock"];
    if (Object.keys(body).some((key) => sensitiveKeys.includes(key))) {
      await audit(request, {
        action: "settings.preferences.update",
        entityType: "UserPreference",
        entityId: `${tenant.userId}:${tenant.companyId}:${tenant.branchId}`,
        before,
        after: preferences
      });
    }

    return preferences;
  });

  app.get("/api/v1/companies", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "company.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.company.findMany({
      where: {
        organizationId: request.tenant!.organizationId,
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
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/companies", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "company.manage");
    const body = parseBody(createCompanyBodySchema, request);
    const company = await prisma.company.create({
      data: {
        organizationId: request.tenant!.organizationId,
        legalName: body.legalName,
        tradeName: body.tradeName ?? null,
        cnpj: body.cnpj ?? null
      },
      select: { id: true, legalName: true, tradeName: true, cnpj: true, active: true }
    });

    await audit(request, { action: "company.create", entityType: "Company", entityId: company.id, after: company });
    return reply.status(201).send(company);
  });

  app.patch("/api/v1/companies/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "company.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateCompanyBodySchema, request);
    const existing = await prisma.company.findFirst({
      where: { id: params.id, organizationId: request.tenant!.organizationId },
      select: { id: true, legalName: true, tradeName: true, cnpj: true, active: true }
    });

    if (!existing) {
      throw errors.notFound("COMPANY_NOT_FOUND", "Empresa não encontrada.");
    }

    const updated = await prisma.company.update({
      where: { id: existing.id },
      data: {
        ...(body.legalName !== undefined ? { legalName: body.legalName } : {}),
        ...(body.tradeName !== undefined ? { tradeName: body.tradeName } : {}),
        ...(body.cnpj !== undefined ? { cnpj: body.cnpj } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      },
      select: { id: true, legalName: true, tradeName: true, cnpj: true, active: true }
    });

    await audit(request, {
      action: "company.update",
      entityType: "Company",
      entityId: updated.id,
      before: existing,
      after: updated
    });
    return updated;
  });

  app.get("/api/v1/branches", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "branch.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.branch.findMany({
      where: {
        companyId: request.tenant!.companyId,
        ...(query.search ? { name: { contains: query.search } } : {})
      },
      select: { id: true, name: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/branches", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "branch.manage");
    const body = parseBody(createBranchBodySchema, request);
    const tenant = request.tenant!;

    const currentAccess = await prisma.userBranchAccess.findFirst({
      where: { userId: tenant.userId, branchId: tenant.branchId, active: true },
      select: { roleId: true }
    });

    if (!currentAccess) {
      throw errors.forbidden();
    }

    const branch = await prisma.$transaction(async (tx) => {
      const created = await tx.branch.create({
        data: {
          companyId: tenant.companyId,
          name: body.name
        },
        select: { id: true, name: true, active: true, createdAt: true }
      });

      const warehouse = await tx.warehouse.create({
        data: {
          companyId: tenant.companyId,
          branchId: created.id,
          name: body.defaultWarehouseName ?? "Estoque Principal"
        },
        select: { id: true, name: true, active: true }
      });

      await tx.userBranchAccess.create({
        data: {
          userId: tenant.userId,
          branchId: created.id,
          roleId: currentAccess.roleId
        }
      });

      return { ...created, defaultWarehouse: warehouse };
    });

    await audit(request, { action: "branch.create", entityType: "Branch", entityId: branch.id, after: branch });
    return reply.status(201).send(branch);
  });

  app.patch("/api/v1/branches/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "branch.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateBranchBodySchema, request);
    const existing = await prisma.branch.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true, name: true, active: true }
    });

    if (!existing) {
      throw errors.notFound("BRANCH_NOT_FOUND", "Loja não encontrada.");
    }

    const updated = await prisma.branch.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      },
      select: { id: true, name: true, active: true }
    });

    await audit(request, { action: "branch.update", entityType: "Branch", entityId: updated.id, before: existing, after: updated });
    return updated;
  });

  app.get("/api/v1/warehouses", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "branch.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.warehouse.findMany({
      where: {
        companyId: request.tenant!.companyId,
        branchId: request.tenant!.branchId,
        ...(query.search ? { name: { contains: query.search } } : {})
      },
      select: { id: true, branchId: true, name: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/warehouses", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "branch.manage");
    const body = parseBody(createWarehouseBodySchema, request);
    const branchId = body.branchId ?? request.tenant!.branchId;
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, companyId: request.tenant!.companyId, active: true },
      select: { id: true }
    });

    if (!branch) {
      throw errors.notFound("BRANCH_NOT_FOUND", "Loja não encontrada.");
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        companyId: request.tenant!.companyId,
        branchId: branch.id,
        name: body.name
      },
      select: { id: true, branchId: true, name: true, active: true }
    });

    await audit(request, { action: "warehouse.create", entityType: "Warehouse", entityId: warehouse.id, after: warehouse });
    return reply.status(201).send(warehouse);
  });

  app.patch("/api/v1/warehouses/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "branch.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateWarehouseBodySchema, request);
    const existing = await prisma.warehouse.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId, branchId: request.tenant!.branchId },
      select: { id: true, branchId: true, name: true, active: true }
    });

    if (!existing) {
      throw errors.notFound("WAREHOUSE_NOT_FOUND", "Depósito não encontrado.");
    }

    const updated = await prisma.warehouse.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      },
      select: { id: true, branchId: true, name: true, active: true }
    });

    await audit(request, {
      action: "warehouse.update",
      entityType: "Warehouse",
      entityId: updated.id,
      before: existing,
      after: updated
    });
    return updated;
  });

  app.get("/api/v1/roles", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "user.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.role.findMany({
      where: {
        companyId: request.tenant!.companyId,
        scope: { in: ["ORGANIZATION", "COMPANY", "BRANCH"] },
        ...(query.search ? { name: { contains: query.search } } : {})
      },
      select: {
        id: true,
        name: true,
        scope: true,
        system: true,
        permissions: { select: { permission: { select: { key: true } } } }
      },
      orderBy: { name: "asc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/roles", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "user.manage");
    const body = parseBody(createRoleBodySchema, request);

    const permissions = await prisma.permission.findMany({
      where: {
        key: {
          in: body.permissionKeys.filter((key) => key !== "platform.admin")
        }
      },
      select: { id: true, key: true }
    });

    if (permissions.length !== body.permissionKeys.length) {
      throw errors.notFound("PERMISSION_NOT_FOUND", "Uma ou mais permissões não foram encontradas.");
    }

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          companyId: request.tenant!.companyId,
          name: body.name,
          scope: body.scope
        },
        select: { id: true, name: true, scope: true }
      });

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: created.id,
          permissionId: permission.id
        })),
        skipDuplicates: true
      });

      return created;
    });

    await audit(request, { action: "role.create", entityType: "Role", entityId: role.id, after: role });
    return reply.status(201).send(role);
  });

  app.get("/api/v1/users", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "user.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.user.findMany({
      where: {
        companyAccesses: { some: { companyId: request.tenant!.companyId, active: true } },
        ...(query.search
          ? {
              OR: [{ name: { contains: query.search } }, { email: { contains: query.search } }]
            }
          : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        companyAccesses: {
          where: { companyId: request.tenant!.companyId },
          select: { role: { select: { id: true, name: true } } }
        },
        branchAccesses: {
          where: { branch: { companyId: request.tenant!.companyId } },
          select: { branch: { select: { id: true, name: true } }, active: true }
        }
      },
      orderBy: { name: "asc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/users", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "user.manage");
    const body = parseBody(createUserBodySchema, request);

    const role = await prisma.role.findFirst({
      where: { id: body.roleId, companyId: request.tenant!.companyId },
      select: { id: true }
    });

    if (!role) {
      throw errors.notFound("ROLE_NOT_FOUND", "Perfil de acesso não encontrado.");
    }

    const branches = await prisma.branch.findMany({
      where: { id: { in: body.branchIds }, companyId: request.tenant!.companyId, active: true },
      select: { id: true }
    });

    if (branches.length !== body.branchIds.length) {
      throw errors.notFound("BRANCH_NOT_FOUND", "Uma ou mais lojas não foram encontradas.");
    }

    const passwordHash = await argon2.hash(body.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1
    });

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          passwordHash
        },
        select: { id: true, name: true, email: true, active: true }
      });

      await tx.userOrganizationAccess.create({
        data: {
          userId: created.id,
          organizationId: request.tenant!.organizationId,
          roleId: role.id
        }
      });

      await tx.userCompanyAccess.create({
        data: {
          userId: created.id,
          companyId: request.tenant!.companyId,
          roleId: role.id
        }
      });

      await tx.userBranchAccess.createMany({
        data: branches.map((branch) => ({
          userId: created.id,
          branchId: branch.id,
          roleId: role.id
        })),
        skipDuplicates: true
      });

      return created;
    });

    await audit(request, { action: "user.create", entityType: "User", entityId: user.id, after: user });
    return reply.status(201).send(user);
  });

  app.patch("/api/v1/users/:id/status", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "user.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateUserStatusBodySchema, request);

    const existing = await prisma.user.findFirst({
      where: {
        id: params.id,
        companyAccesses: { some: { companyId: request.tenant!.companyId } }
      },
      select: { id: true, name: true, email: true, active: true }
    });

    if (!existing) {
      throw errors.notFound("USER_NOT_FOUND", "Usuário não encontrado.");
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { active: body.active },
      select: { id: true, name: true, email: true, active: true }
    });

    await audit(request, {
      action: "user.status_update",
      entityType: "User",
      entityId: updated.id,
      before: existing,
      after: updated
    });

    return updated;
  });

  app.patch("/api/v1/users/:id/access", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "user.manage");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateUserAccessBodySchema, request);
    const tenant = request.tenant!;

    const [existing, role, branches] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: params.id,
          companyAccesses: { some: { companyId: tenant.companyId, active: true } }
        },
        select: {
          id: true,
          name: true,
          email: true,
          companyAccesses: {
            where: { companyId: tenant.companyId },
            select: { roleId: true, active: true }
          },
          branchAccesses: {
            where: { branch: { companyId: tenant.companyId } },
            select: { branchId: true, roleId: true, active: true }
          }
        }
      }),
      prisma.role.findFirst({
        where: { id: body.roleId, companyId: tenant.companyId, scope: { in: ["ORGANIZATION", "COMPANY", "BRANCH"] } },
        select: { id: true }
      }),
      prisma.branch.findMany({
        where: { id: { in: body.branchIds }, companyId: tenant.companyId, active: true },
        select: { id: true }
      })
    ]);

    if (!existing) {
      throw errors.notFound("USER_NOT_FOUND", "Usuário não encontrado.");
    }

    if (!role) {
      throw errors.notFound("ROLE_NOT_FOUND", "Perfil de acesso não encontrado.");
    }

    if (branches.length !== body.branchIds.length) {
      throw errors.notFound("BRANCH_NOT_FOUND", "Uma ou mais lojas não foram encontradas.");
    }

    const before = existing;
    const branchIds = new Set(body.branchIds);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.userCompanyAccess.updateMany({
        where: { userId: existing.id, companyId: tenant.companyId },
        data: { roleId: role.id, active: true }
      });

      await tx.userBranchAccess.updateMany({
        where: { userId: existing.id, branch: { companyId: tenant.companyId } },
        data: { active: false }
      });

      for (const branchId of branchIds) {
        await tx.userBranchAccess.upsert({
          where: { userId_branchId: { userId: existing.id, branchId } },
          create: { userId: existing.id, branchId, roleId: role.id, active: true },
          update: { roleId: role.id, active: true }
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: existing.id },
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          companyAccesses: {
            where: { companyId: tenant.companyId },
            select: { role: { select: { id: true, name: true } } }
          },
          branchAccesses: {
            where: { branch: { companyId: tenant.companyId } },
            select: { branch: { select: { id: true, name: true } }, active: true }
          }
        }
      });
    });

    await audit(request, {
      action: "user.access_update",
      entityType: "User",
      entityId: updated.id,
      before,
      after: updated
    });

    return updated;
  });
}
