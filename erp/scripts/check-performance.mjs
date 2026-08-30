import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadRootEnv } from "./env.mjs";

const root = new URL("..", import.meta.url).pathname;
loadRootEnv(root);

const args = new Set(process.argv.slice(2));
const runLoad = args.has("--load") || (!args.has("--explain") && !args.has("--pool"));
const runExplain = args.has("--explain");
const runPool = args.has("--pool") || runExplain;
const baseUrl = process.env.PERF_API_URL ?? "http://127.0.0.1:3333";
const concurrency = Number(process.env.PERF_CONCURRENCY ?? "8");
const rounds = Number(process.env.PERF_ROUNDS ?? "4");
const maxP95Ms = Number(process.env.PERF_MAX_P95_MS ?? "1500");
const loadRateLimitMax = process.env.PERF_RATE_LIMIT_MAX ?? "10000";

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

assertPositiveInteger(concurrency, "PERF_CONCURRENCY");
assertPositiveInteger(rounds, "PERF_ROUNDS");

function databaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  return new URL(process.env.DATABASE_URL);
}

function mysqlArgs(statement) {
  const url = databaseUrl();
  const args = [
    `-h${url.hostname}`,
    `-P${url.port || "3306"}`,
    `-u${decodeURIComponent(url.username)}`,
    decodeURIComponent(url.pathname.replace(/^\//, "")),
    "-e",
    statement
  ];
  const password = decodeURIComponent(url.password);
  if (password) {
    args.splice(3, 0, `-p${password}`);
  }
  return args;
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

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] ?? 0;
}

async function request(path, options = {}) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, options);
  await response.arrayBuffer();
  return { status: response.status, ms: performance.now() - started };
}

async function waitForReady() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const result = await request("/ready");
      if (result.status === 200) {
        return;
      }
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("API did not become ready");
}

async function login() {
  const email = process.env.DEV_ADMIN_EMAIL ?? "admin@local.test";
  const password = process.env.DEV_ADMIN_PASSWORD ?? "ChangeMe123!";
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok || !payload.accessToken) {
    throw new Error(`login failed with ${response.status}`);
  }
  return payload.accessToken;
}

async function runLoadCheck() {
  let startedServer = false;
  let api = null;

  try {
    try {
      await waitForReady();
    } catch {
      api = spawn("./node_modules/.bin/tsx", ["apps/api/src/server.ts"], {
        cwd: root,
        stdio: process.env.PERF_VERBOSE === "true" ? "inherit" : "ignore",
        shell: false,
        env: { ...process.env, API_PORT: "3333", LOG_LEVEL: process.env.LOG_LEVEL ?? "warn", RATE_LIMIT_MAX: loadRateLimitMax }
      });
      startedServer = true;
      await waitForReady();
    }

    const accessToken = await login();
    const headers = { authorization: `Bearer ${accessToken}` };
    const paths = [
      "/api/v1/dashboard",
      "/api/v1/products?limit=25",
      "/api/v1/sales?limit=25",
      "/api/v1/inventory/balances?limit=25",
      "/api/v1/alerts?limit=25",
      "/api/v1/search?search=teste&limit=25"
    ];

    const timings = [];
    const statuses = new Map();
    const jobs = [];
    for (let round = 0; round < rounds; round += 1) {
      for (let index = 0; index < concurrency; index += 1) {
        const path = paths[(round + index) % paths.length];
        jobs.push(
          request(path, { headers }).then((result) => {
            timings.push(result.ms);
            statuses.set(result.status, (statuses.get(result.status) ?? 0) + 1);
          })
        );
      }
    }
    await Promise.all(jobs);

    const p95 = percentile(timings, 0.95);
    const failures = [...statuses.entries()].filter(([status]) => status >= 500);
    console.log(JSON.stringify({ requests: timings.length, concurrency, rounds, p50Ms: Math.round(percentile(timings, 0.5)), p95Ms: Math.round(p95), statuses: Object.fromEntries(statuses) }, null, 2));

    if (failures.length > 0) {
      throw new Error(`load check had 5xx responses: ${JSON.stringify(failures)}`);
    }
    if (p95 > maxP95Ms) {
      throw new Error(`load check p95 ${Math.round(p95)}ms exceeded PERF_MAX_P95_MS ${maxP95Ms}ms`);
    }
  } finally {
    if (startedServer && api) {
      api.kill("SIGTERM");
    }
  }
}

function runPoolCheck() {
  const url = databaseUrl();
  const params = url.searchParams;
  const connectionLimit = params.get("connection_limit");
  const poolTimeout = params.get("pool_timeout");
  const warnings = [];
  if (!connectionLimit) {
    warnings.push("DATABASE_URL sem connection_limit; defina por réplica para não estourar o MySQL.");
  }
  if (!poolTimeout) {
    warnings.push("DATABASE_URL sem pool_timeout; defina timeout explícito para degradar previsivelmente sob saturação.");
  }

  console.log(JSON.stringify({ connectionLimit, poolTimeout, warnings }, null, 2));
  if (process.env.NODE_ENV === "production" && warnings.length > 0) {
    throw new Error("Production DATABASE_URL must define connection_limit and pool_timeout");
  }
}

function runExplainCheck() {
  const sqlPath = resolve(root, "scripts/performance-explain.sql");
  if (!existsSync(sqlPath)) {
    throw new Error("scripts/performance-explain.sql not found");
  }
  const output = runMysql(readFileSync(sqlPath, "utf8"));
  console.log(output);
}

if (runPool) {
  runPoolCheck();
}
if (runExplain) {
  runExplainCheck();
}
if (runLoad) {
  await runLoadCheck();
}

console.log("performance checks passed");
