import type { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "@erp/database";
import { config } from "@erp/config";
import { errors, verifyAdminAccessToken, verifyUserAccessToken } from "@erp/security";

function bearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw errors.unauthorized();
  }
  return authorization.slice("Bearer ".length);
}

export async function registerTenantPlugin(app: FastifyInstance) {
  app.decorateRequest("tenant", undefined);
  app.decorateRequest("admin", undefined);

  app.decorate("authenticateUser", async (request: FastifyRequest) => {
    const claims = await verifyUserAccessToken(config, bearerToken(request));

    const user = await prisma.user.findFirst({
      where: {
        id: claims.userId,
        active: true,
        sessions: {
          some: {
            id: claims.sessionId,
            status: "ACTIVE"
          }
        },
        organizationAccesses: {
          some: {
            organizationId: claims.organizationId,
            active: true
          }
        },
        companyAccesses: {
          some: {
            companyId: claims.companyId,
            active: true
          }
        },
        branchAccesses: {
          some: {
            branchId: claims.branchId,
            active: true
          }
        }
      },
      select: { id: true }
    });

    if (!user) {
      throw errors.invalidTenant();
    }

    request.tenant = claims;
  });

  app.decorate("authenticateAdmin", async (request: FastifyRequest) => {
    const claims = await verifyAdminAccessToken(config, bearerToken(request));

    const user = await prisma.user.findFirst({
      where: {
        id: claims.userId,
        active: true,
        sessions: {
          some: {
            id: claims.sessionId,
            status: "ACTIVE"
          }
        },
        platformAccesses: {
          some: {
            active: true,
            role: {
              scope: "PLATFORM",
              permissions: {
                some: {
                  permission: {
                    key: "platform.admin"
                  }
                }
              }
            }
          }
        }
      },
      select: { id: true }
    });

    if (!user || !claims.permissions.includes("platform.admin")) {
      throw errors.forbidden();
    }

    request.admin = claims;
  });
}

declare module "fastify" {
  interface FastifyInstance {
    authenticateUser(request: FastifyRequest): Promise<void>;
    authenticateAdmin(request: FastifyRequest): Promise<void>;
  }
}
