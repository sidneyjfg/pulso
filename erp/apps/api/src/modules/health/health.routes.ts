import type { FastifyInstance } from "fastify";
import { prisma } from "@erp/database";
import { Redis } from "ioredis";
import { config } from "@erp/config";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok"
  }));

  app.get("/ready", async (_request, reply) => {
    const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

    try {
      await prisma.$queryRaw`SELECT 1`;
      await redis.connect();
      await redis.ping();
      return { status: "ready" };
    } catch {
      return reply.status(503).send({ status: "not_ready" });
    } finally {
      redis.disconnect();
    }
  });
}
