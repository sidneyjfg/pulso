import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient, SalesChannel, SaleSource } from "@prisma/client";
import { seedDatabase } from "./seed.js";

function loadRootEnv() {
  const envPath = resolve(import.meta.dirname, "../../..", ".env");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function withDatabaseName(connectionString: string, databaseName: string) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function runPrismaDbPush(databaseUrl: string) {
  const rootDir = resolve(import.meta.dirname, "../../..");
  const scriptPath = resolve(rootDir, "scripts/prisma.mjs");
  const result = spawnSync(process.execPath, [scriptPath, "db", "push", "--skip-generate"], {
    cwd: rootDir,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl
    },
    encoding: "utf8",
    shell: false
  });

  if (result.status !== 0) {
    throw new Error(`prisma db push failed\n${result.stdout}\n${result.stderr}`);
  }
}

loadRootEnv();

describe("database seed regression", () => {
  let prisma: PrismaClient;
  let temporaryDatabaseName = "";
  let temporaryDatabaseUrl = "";
  let adminDatabaseUrl = "";

  beforeAll(async () => {
    const baseDatabaseUrl = process.env.DATABASE_URL;
    if (!baseDatabaseUrl) {
      throw new Error("DATABASE_URL is required to run seed regression tests.");
    }

    const timestamp = Date.now().toString(36);
    const random = randomUUID().replace(/-/g, "").slice(0, 12);
    temporaryDatabaseName = `erp_sr_${timestamp}_${random}`;
    adminDatabaseUrl = process.env.MYSQL_ADMIN_URL?.trim() || withDatabaseName(baseDatabaseUrl, "mysql");
    temporaryDatabaseUrl = withDatabaseName(baseDatabaseUrl, temporaryDatabaseName);

    const adminPrisma = new PrismaClient({
      datasources: {
        db: { url: adminDatabaseUrl }
      }
    });

    await adminPrisma.$executeRawUnsafe(
      `CREATE DATABASE \`${temporaryDatabaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await adminPrisma.$disconnect();

    runPrismaDbPush(temporaryDatabaseUrl);

    prisma = new PrismaClient({
      datasources: {
        db: { url: temporaryDatabaseUrl }
      }
    });

    await seedDatabase(prisma, {
      organizationName: "Org Regressão Seed",
      companyName: "Empresa Regressão Seed",
      adminEmail: "admin-regression@local.test",
      adminPassword: "RegressionSeed123!"
    });
  }, 180_000);

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }

    if (temporaryDatabaseName && adminDatabaseUrl) {
      const adminPrisma = new PrismaClient({
        datasources: {
          db: { url: adminDatabaseUrl }
        }
      });

      await adminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${temporaryDatabaseName}\``);
      await adminPrisma.$disconnect();
    }
  }, 60_000);

  it("populates core and operational tables", async () => {
    await expect(prisma.organization.count()).resolves.toBeGreaterThan(0);
    await expect(prisma.company.count()).resolves.toBeGreaterThan(0);
    await expect(prisma.branch.count()).resolves.toBeGreaterThanOrEqual(2);
    await expect(prisma.warehouse.count()).resolves.toBeGreaterThanOrEqual(2);
    await expect(prisma.product.count()).resolves.toBeGreaterThanOrEqual(4);
    await expect(prisma.customer.count()).resolves.toBeGreaterThan(0);
    await expect(prisma.supplier.count()).resolves.toBeGreaterThan(0);
    await expect(prisma.sale.count()).resolves.toBeGreaterThanOrEqual(2);
    await expect(prisma.purchase.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.stockTransfer.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.inventoryCount.count()).resolves.toBeGreaterThanOrEqual(1);
  });

  it("populates fiscal, growth and integration support tables", async () => {
    await expect(prisma.companyFiscalProfile.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.companyPricingSetting.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.productFiscalProfile.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.taxRule.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.taxRuleVersion.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.alert.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.alertRule.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.importJob.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.reportJob.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.integrationConnection.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.outboxEvent.count()).resolves.toBeGreaterThanOrEqual(1);
    await expect(prisma.webhookEvent.count()).resolves.toBeGreaterThanOrEqual(1);
  });

  it("keeps iFood and 99 data out of regression seed", async () => {
    const ifoodOr99SaleSources = await prisma.sale.count({
      where: {
        source: {
          in: [SaleSource.IFOOD, SaleSource.FOOD99]
        }
      }
    });

    const ifoodOr99Channels = await prisma.integrationConnection.count({
      where: {
        channel: {
          in: [SalesChannel.IFOOD, SalesChannel.FOOD99]
        }
      }
    });

    const ifoodOr99WebhookChannels = await prisma.webhookEvent.count({
      where: {
        channel: {
          in: [SalesChannel.IFOOD, SalesChannel.FOOD99]
        }
      }
    });

    expect(ifoodOr99SaleSources).toBe(0);
    expect(ifoodOr99Channels).toBe(0);
    expect(ifoodOr99WebhookChannels).toBe(0);
  });

  it("can run seed repeatedly without creating duplicates by fixed identifiers", async () => {
    const salesBefore = await prisma.sale.count();
    const webhookBefore = await prisma.webhookEvent.count();

    await seedDatabase(prisma, {
      organizationName: "Org Regressão Seed",
      companyName: "Empresa Regressão Seed",
      adminEmail: "admin-regression@local.test",
      adminPassword: "RegressionSeed123!"
    });

    await expect(prisma.sale.count()).resolves.toBe(salesBefore);
    await expect(prisma.webhookEvent.count()).resolves.toBe(webhookBefore);
  });
});
