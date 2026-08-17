import "dotenv/config";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import pino from "pino";
import { config } from "@erp/config";

const logger = pino({
  level: config.LOG_LEVEL,
  redact: ["*.token", "*.password", "*.authorization", "*.cookie", "*.clientSecret", "*.apiKey"]
});

const connection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null
});

const worker = new Worker(
  "default",
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, "worker job received");
  },
  { connection }
);

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, err: error }, "worker job failed");
});

logger.info("worker started");

process.on("SIGTERM", async () => {
  await worker.close();
  connection.disconnect();
  process.exit(0);
});
