import "./types.js";
import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { config } from "@erp/config";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { foundationRoutes } from "./modules/foundation/foundation.routes.js";
import { inventoryRoutes } from "./modules/inventory/inventory.routes.js";
import { operationRoutes } from "./modules/operations/operation.routes.js";
import { productRoutes } from "./modules/products/product.routes.js";
import { customerRoutes } from "./modules/customers/customer.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { fiscalRoutes } from "./modules/fiscal/fiscal.routes.js";
import { growthRoutes } from "./modules/growth/growth.routes.js";
import { supplierRoutes } from "./modules/suppliers/supplier.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerTenantPlugin } from "./plugins/tenant.js";

const corsOrigins = config.CORS_ORIGINS.split(",").map((origin) => origin.trim());

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers.set-cookie",
          "*.password",
          "*.passwordHash",
          "*.token",
          "*.accessToken",
          "*.refreshToken",
          "*.clientSecret",
          "*.apiKey"
        ],
        censor: "[redacted]"
      }
    },
    genReqId: () => randomUUID()
  });

  app.addHook("onRequest", async (request, reply) => {
    request.correlationId = request.headers["x-correlation-id"]?.toString() ?? request.id;
    reply.header("x-correlation-id", request.correlationId);
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      }
    }
  });
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"), false);
    },
    credentials: true
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "ERP API",
        version: "0.1.0"
      }
    }
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs"
  });

  await registerTenantPlugin(app);
  await registerErrorHandler(app);
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(foundationRoutes);
  await app.register(adminRoutes);
  await app.register(productRoutes);
  await app.register(customerRoutes);
  await app.register(supplierRoutes);
  await app.register(inventoryRoutes);
  await app.register(operationRoutes);
  await app.register(dashboardRoutes);
  await app.register(fiscalRoutes);
  await app.register(growthRoutes);

  return app;
}
