import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { loadRootEnv } from "./env.mjs";

const root = new URL("..", import.meta.url).pathname;
loadRootEnv(root);

const concurrency = Number(process.env.PERF_STOCK_CONCURRENCY ?? "16");
const companyId = process.env.PERF_COMPANY_ID ?? "dev_company";
const branchId = process.env.PERF_BRANCH_ID ?? "dev_branch_centro";

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 1) {
    throw new Error(`${name} must be an integer greater than 1`);
  }
}

assertPositiveInteger(concurrency, "PERF_STOCK_CONCURRENCY");

function databaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  return new URL(process.env.DATABASE_URL);
}

function mysqlArgs(statement) {
  const url = databaseUrl();
  const args = [
    "--batch",
    "--raw",
    "--skip-column-names",
    `-h${url.hostname}`,
    `-P${url.port || "3306"}`,
    `-u${decodeURIComponent(url.username)}`,
    decodeURIComponent(url.pathname.replace(/^\//, "")),
    "-e",
    statement
  ];
  const password = decodeURIComponent(url.password);
  if (password) {
    args.splice(6, 0, `-p${password}`);
  }
  return args;
}

function sqlLiteral(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function runMysql(statement) {
  const result = spawnSync("mysql", mysqlArgs(statement), {
    cwd: root,
    encoding: "utf8",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "mysql failed");
  }
  return result.stdout.trim();
}

function runMysqlAsync(statement) {
  return new Promise((resolve, reject) => {
    const child = spawn("mysql", mysqlArgs(statement), {
      cwd: root,
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => {
      if (status !== 0) {
        reject(new Error(stderr || "mysql failed"));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function firstValue(output) {
  return output.split(/\r?\n/).find(Boolean) ?? "";
}

const suffix = randomUUID().replace(/-/g, "").slice(0, 20);
const productId = `perf_product_${suffix}`;
const balanceId = `perf_balance_${suffix}`;
const sku = `PERF-STOCK-${suffix}`;

let prepared = false;

try {
  const warehouseId = firstValue(
    runMysql(
      `SELECT id FROM Warehouse WHERE companyId = ${sqlLiteral(companyId)} AND branchId = ${sqlLiteral(branchId)} AND active = 1 ORDER BY id LIMIT 1;`
    )
  );
  if (!warehouseId) {
    throw new Error(`No active warehouse found for company ${companyId} branch ${branchId}`);
  }

  runMysql(`
    INSERT INTO Product (id, companyId, sku, name, unit, salePrice, active, createdAt, updatedAt)
    VALUES (${sqlLiteral(productId)}, ${sqlLiteral(companyId)}, ${sqlLiteral(sku)}, 'Performance stock concurrency', 'UN', 1.00, 1, NOW(3), NOW(3));

    INSERT INTO StockBalance (id, companyId, branchId, warehouseId, productId, quantity, reservedQuantity, updatedAt)
    VALUES (${sqlLiteral(balanceId)}, ${sqlLiteral(companyId)}, ${sqlLiteral(branchId)}, ${sqlLiteral(warehouseId)}, ${sqlLiteral(productId)}, 1.000, 0.000, NOW(3));
  `);
  prepared = true;

  const reserveSql = `
    START TRANSACTION;
    UPDATE StockBalance
       SET reservedQuantity = reservedQuantity + 1.000,
           updatedAt = NOW(3)
     WHERE id = ${sqlLiteral(balanceId)}
       AND quantity - reservedQuantity >= 1.000;
    SELECT ROW_COUNT();
    COMMIT;
  `;

  const outputs = await Promise.all(Array.from({ length: concurrency }, () => runMysqlAsync(reserveSql)));
  const successes = outputs.filter((output) => Number(firstValue(output)) === 1).length;
  const rejected = outputs.filter((output) => Number(firstValue(output)) === 0).length;
  const finalReserved = Number(firstValue(runMysql(`SELECT reservedQuantity FROM StockBalance WHERE id = ${sqlLiteral(balanceId)};`)));

  const result = { concurrency, successes, rejected, finalReserved };
  console.log(JSON.stringify(result, null, 2));

  if (successes !== 1 || rejected !== concurrency - 1 || finalReserved !== 1) {
    throw new Error("Stock concurrency check failed: expected exactly one successful reservation");
  }
} finally {
  if (prepared) {
    runMysql(`
      DELETE FROM StockBalance WHERE id = ${sqlLiteral(balanceId)};
      DELETE FROM Product WHERE id = ${sqlLiteral(productId)};
    `);
  }
}

console.log("stock concurrency check passed");
