import argon2 from "argon2";
import type { FastifyRequest } from "fastify";
import { prisma } from "@erp/database";
import { config } from "@erp/config";
import {
  createOpaqueRefreshToken,
  errors,
  hashRefreshToken,
  signAdminAccessToken,
  signUserAccessToken,
  type TenantContext
} from "@erp/security";
import type { AdminLoginBody, LoginBody, RegisterBody, SwitchContextBody } from "@erp/contracts";

const companyPermissionKeys = [
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

function expiresAtFromDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function createSessionTokens(
  userId: string,
  request: FastifyRequest,
  selection: {
    organizationId?: string | undefined;
    companyId?: string | undefined;
    branchId?: string | undefined;
  }
) {
  const session = await prisma.session.create({
    data: {
      userId,
      ip: request.ip,
      userAgent: request.headers["user-agent"]?.toString() ?? null
    }
  });

  const tenant = await buildTenantContext(userId, session.id, selection);
  await prisma.session.update({
    where: { id: session.id },
    data: {
      activeOrganizationId: tenant.organizationId,
      activeCompanyId: tenant.companyId,
      activeBranchId: tenant.branchId
    }
  });

  const accessToken = await signUserAccessToken(config, { tokenType: "USER_ACCESS", ...tenant });
  const refreshToken = createOpaqueRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      sessionId: session.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: expiresAtFromDays(config.REFRESH_TOKEN_EXPIRES_IN_DAYS)
    }
  });

  return { session, tenant, accessToken, refreshToken };
}

async function buildTenantContext(
  userId: string,
  sessionId: string,
  selection: {
    organizationId?: string | undefined;
    companyId?: string | undefined;
    branchId?: string | undefined;
  }
): Promise<TenantContext> {
  const access = await prisma.user.findFirst({
    where: { id: userId, active: true },
    select: {
      organizationAccesses: {
        where: selection.organizationId
          ? { organizationId: selection.organizationId, active: true }
          : { active: true },
        take: 1,
        select: {
          organizationId: true,
          role: {
            select: {
              name: true,
              permissions: { select: { permission: { select: { key: true } } } }
            }
          }
        }
      },
      companyAccesses: {
        where: selection.companyId ? { companyId: selection.companyId, active: true } : { active: true },
        take: 1,
        select: {
          companyId: true,
          company: { select: { organizationId: true, active: true } },
          role: {
            select: {
              name: true,
              permissions: { select: { permission: { select: { key: true } } } }
            }
          }
        }
      },
      branchAccesses: {
        where: selection.branchId ? { branchId: selection.branchId, active: true } : { active: true },
        take: 1,
        select: {
          branchId: true,
          branch: { select: { companyId: true, active: true } },
          role: {
            select: {
              name: true,
              permissions: { select: { permission: { select: { key: true } } } }
            }
          }
        }
      }
    }
  });

  const organization = access?.organizationAccesses[0];
  const company = access?.companyAccesses[0];
  const branch = access?.branchAccesses[0];

  if (!organization || !company || !branch) {
    throw errors.invalidTenant();
  }

  if (company.company.organizationId !== organization.organizationId || branch.branch.companyId !== company.companyId) {
    throw errors.invalidTenant();
  }

  if (!company.company.active || !branch.branch.active) {
    throw errors.invalidTenant();
  }

  const role = branch.role.name || company.role.name || organization.role.name;
  const permissions = new Set<string>();

  for (const source of [organization.role, company.role, branch.role]) {
    for (const rolePermission of source.permissions) {
      permissions.add(rolePermission.permission.key);
    }
  }

  return {
    userId,
    sessionId,
    organizationId: organization.organizationId,
    companyId: company.companyId,
    branchId: branch.branchId,
    role,
    permissions: [...permissions].sort()
  };
}

export async function login(body: LoginBody, request: FastifyRequest) {
  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: {
      id: true,
      active: true,
      passwordHash: true
    }
  });

  if (!user) {
    throw errors.invalidCredentials();
  }

  if (!user.active) {
    throw errors.inactiveUser();
  }

  const validPassword = await argon2.verify(user.passwordHash, body.password);
  if (!validPassword) {
    throw errors.invalidCredentials();
  }

  const { session, tenant, accessToken, refreshToken } = await createSessionTokens(user.id, request, body);

  await prisma.auditLog.create({
    data: {
      companyId: tenant.companyId,
      branchId: tenant.branchId,
      userId: user.id,
      action: "auth.login",
      entityType: "Session",
      entityId: session.id,
      ip: request.ip,
      userAgent: request.headers["user-agent"]?.toString() ?? null,
      correlationId: request.correlationId
    }
  });

  return { accessToken, refreshToken, tenant };
}

export async function register(body: RegisterBody, request: FastifyRequest) {
  const passwordHash = await argon2.hash(body.password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });

  let created: { userId: string; organizationId: string; companyId: string; branchId: string };

  try {
    created = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: body.email },
        select: { id: true }
      });

      if (existingUser) {
        throw errors.conflict("USER_ALREADY_EXISTS", "Já existe uma conta com este e-mail.");
      }

      await tx.permission.createMany({
        data: companyPermissionKeys.map((key) => ({ key, description: key })),
        skipDuplicates: true
      });

      const permissions = await tx.permission.findMany({
        where: { key: { in: [...companyPermissionKeys] } },
        select: { id: true }
      });

      if (permissions.length !== companyPermissionKeys.length) {
        throw new Error("Default company permissions are not available.");
      }

      const organization = await tx.organization.create({
        data: { name: body.companyName }
      });

      const company = await tx.company.create({
        data: {
          organizationId: organization.id,
          legalName: body.companyName,
          tradeName: body.companyName
        }
      });

      const branch = await tx.branch.create({
        data: {
          companyId: company.id,
          name: body.branchName
        }
      });

      await tx.warehouse.create({
        data: {
          companyId: company.id,
          branchId: branch.id,
          name: "Estoque Principal"
        }
      });

      const role = await tx.role.create({
        data: {
          companyId: company.id,
          name: "Administrador",
          scope: "COMPANY",
          system: true
        }
      });

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id
        })),
        skipDuplicates: true
      });

      const user = await tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          passwordHash
        }
      });

      await tx.userOrganizationAccess.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: role.id
        }
      });

      await tx.userCompanyAccess.create({
        data: {
          userId: user.id,
          companyId: company.id,
          roleId: role.id
        }
      });

      await tx.userBranchAccess.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          roleId: role.id
        }
      });

      await tx.auditLog.create({
        data: {
          companyId: company.id,
          branchId: branch.id,
          userId: user.id,
          action: "auth.register",
          entityType: "User",
          entityId: user.id,
          ip: request.ip,
          userAgent: request.headers["user-agent"]?.toString() ?? null,
          correlationId: request.correlationId
        }
      });

      return {
        userId: user.id,
        organizationId: organization.id,
        companyId: company.id,
        branchId: branch.id
      };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw errors.conflict("USER_ALREADY_EXISTS", "Já existe uma conta com este e-mail.");
    }

    throw error;
  }

  const { tenant, accessToken, refreshToken } = await createSessionTokens(created.userId, request, {
    organizationId: created.organizationId,
    companyId: created.companyId,
    branchId: created.branchId
  });

  return { accessToken, refreshToken, tenant };
}

export async function adminLogin(body: AdminLoginBody, request: FastifyRequest) {
  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: {
      id: true,
      active: true,
      passwordHash: true,
      platformAccesses: {
        where: { active: true },
        select: {
          role: {
            select: {
              scope: true,
              permissions: { select: { permission: { select: { key: true } } } }
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw errors.invalidCredentials();
  }

  if (!user.active) {
    throw errors.inactiveUser();
  }

  const validPassword = await argon2.verify(user.passwordHash, body.password);
  if (!validPassword) {
    throw errors.invalidCredentials();
  }

  const permissions = new Set<string>();
  for (const access of user.platformAccesses) {
    if (access.role.scope !== "PLATFORM") {
      continue;
    }

    for (const rolePermission of access.role.permissions) {
      permissions.add(rolePermission.permission.key);
    }
  }

  if (!permissions.has("platform.admin")) {
    throw errors.forbidden();
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      ip: request.ip,
      userAgent: request.headers["user-agent"]?.toString() ?? null
    }
  });

  const accessToken = await signAdminAccessToken(config, {
    tokenType: "ADMIN_ACCESS",
    userId: user.id,
    sessionId: session.id,
    permissions: [...permissions].sort()
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "auth.admin_login",
      entityType: "Session",
      entityId: session.id,
      ip: request.ip,
      userAgent: request.headers["user-agent"]?.toString() ?? null,
      correlationId: request.correlationId
    }
  });

  return { accessToken };
}

export async function refresh(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  const token = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      sessionId: true,
      status: true,
      expiresAt: true
    }
  });

  if (!token) {
    throw errors.unauthorized();
  }

  if (token.status !== "ACTIVE") {
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: token.id },
        data: { status: "REUSED", reusedAt: new Date(), revokedAt: new Date() }
      }),
      prisma.session.update({
        where: { id: token.sessionId },
        data: { status: "REVOKED", revokedAt: new Date() }
      }),
      prisma.refreshToken.updateMany({
        where: { sessionId: token.sessionId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() }
      })
    ]);
    throw errors.unauthorized();
  }

  if (token.expiresAt < new Date()) {
    await prisma.refreshToken.update({
      where: { id: token.id },
      data: { status: "EXPIRED", revokedAt: new Date() }
    });
    throw errors.unauthorized();
  }

  const session = await prisma.session.findFirst({
    where: { id: token.sessionId, userId: token.userId, status: "ACTIVE" },
    select: {
      activeOrganizationId: true,
      activeCompanyId: true,
      activeBranchId: true
    }
  });

  if (!session) {
    throw errors.unauthorized();
  }

  const tenant = await buildTenantContext(token.userId, token.sessionId, {
    organizationId: session.activeOrganizationId ?? undefined,
    companyId: session.activeCompanyId ?? undefined,
    branchId: session.activeBranchId ?? undefined
  });
  const nextRefreshToken = createOpaqueRefreshToken();

  await prisma.$transaction(async (tx) => {
    const next = await tx.refreshToken.create({
      data: {
        userId: token.userId,
        sessionId: token.sessionId,
        tokenHash: hashRefreshToken(nextRefreshToken),
        expiresAt: expiresAtFromDays(config.REFRESH_TOKEN_EXPIRES_IN_DAYS)
      }
    });

    await tx.refreshToken.update({
      where: { id: token.id },
      data: {
        status: "ROTATED",
        rotatedToTokenId: next.id,
        revokedAt: new Date()
      }
    });
  });

  const accessToken = await signUserAccessToken(config, { tokenType: "USER_ACCESS", ...tenant });
  return { accessToken, refreshToken: nextRefreshToken, tenant };
}

export async function switchContext(userId: string, sessionId: string, body: SwitchContextBody) {
  const tenant = await buildTenantContext(userId, sessionId, body);
  await prisma.session.updateMany({
    where: { id: sessionId, userId, status: "ACTIVE" },
    data: {
      activeOrganizationId: tenant.organizationId,
      activeCompanyId: tenant.companyId,
      activeBranchId: tenant.branchId
    }
  });
  const accessToken = await signUserAccessToken(config, { tokenType: "USER_ACCESS", ...tenant });
  return { accessToken, tenant };
}

export async function logout(sessionId: string) {
  await prisma.$transaction([
    prisma.session.updateMany({
      where: { id: sessionId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() }
    }),
    prisma.refreshToken.updateMany({
      where: { sessionId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() }
    })
  ]);
}
