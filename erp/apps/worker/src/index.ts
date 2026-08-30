import "dotenv/config";
import { randomUUID } from "node:crypto";
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

async function pollIfoodOrders() {
  if (!config.IFOOD_ENABLED || config.IFOOD_ORDER_POLLING_ENABLED === false) {
    return;
  }

  if (!config.INTERNAL_JOB_SECRET) {
    logger.warn("ifood order polling skipped: INTERNAL_JOB_SECRET is not configured");
    return;
  }

  const lockKey = "pulso:jobs:ifood-orders-poll:lock";
  const lockValue = randomUUID();
  const lockTtlMs = Math.max((config.IFOOD_ORDER_POLLING_INTERVAL_MS ?? 30000) * 2, 60000);
  const locked = await connection.set(lockKey, lockValue, "PX", lockTtlMs, "NX");
  if (locked !== "OK") {
    return;
  }

  try {
    const url = new URL("/internal/jobs/ifood/orders/poll", config.API_URL);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-internal-job-secret": config.INTERNAL_JOB_SECRET
      }
    });

    const payload = await response.text();
    if (!response.ok) {
      throw new Error(`iFood polling request failed with ${response.status}: ${payload}`);
    }

    logger.info({ result: payload ? JSON.parse(payload) : null }, "ifood order polling completed");
  } finally {
    await connection.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      lockKey,
      lockValue
    );
  }
}

let ifoodPollingTimer: NodeJS.Timeout | null = null;
if (config.IFOOD_ENABLED && config.IFOOD_ORDER_POLLING_ENABLED !== false) {
  const intervalMs = config.IFOOD_ORDER_POLLING_INTERVAL_MS ?? 30000;
  ifoodPollingTimer = setInterval(() => {
    void pollIfoodOrders().catch((error) => {
      logger.warn({ err: error }, "ifood order polling failed");
    });
  }, intervalMs);
  ifoodPollingTimer.unref();
  void pollIfoodOrders().catch((error) => {
    logger.warn({ err: error }, "initial ifood order polling failed");
  });
}

logger.info("worker started");

process.on("SIGTERM", async () => {
  if (ifoodPollingTimer) {
    clearInterval(ifoodPollingTimer);
  }
  await worker.close();
  connection.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  if (ifoodPollingTimer) {
    clearInterval(ifoodPollingTimer);
  }
  await worker.close();
  connection.disconnect();
  process.exit(0);
});
