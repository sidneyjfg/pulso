import type { AdminAccessTokenPayload, TenantContext } from "@erp/security";

declare module "fastify" {
  interface FastifyRequest {
    tenant?: TenantContext;
    admin?: AdminAccessTokenPayload;
    correlationId: string;
  }
}
