import { existsSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Socket } from "node:net";
import { loadRootEnv } from "./env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function commandEnv() {
  return {
    ...process.env,
    COREPACK_HOME: process.env.COREPACK_HOME ?? "/tmp/corepack",
    XDG_DATA_HOME: process.env.XDG_DATA_HOME ?? "/tmp/pnpm-data",
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? "/tmp/cache",
    PNPM_HOME: process.env.PNPM_HOME ?? "/tmp/pnpm-home"
  };
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: commandEnv()
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function runWithEnv(command, args, extraEnv) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: {
      ...commandEnv(),
      ...extraEnv
    }
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    shell: false,
    env: commandEnv()
  });
  return result.status === 0;
}

function canRun(command, args) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    shell: false,
    env: commandEnv()
  });
  return result.status === 0;
}

function resolveComposeCommand() {
  if (canRun("docker", ["compose", "version"])) {
    return { command: "docker", baseArgs: ["compose"] };
  }

  if (canRun("docker-compose", ["version"])) {
    return { command: "docker-compose", baseArgs: [] };
  }

  throw new Error("Docker Compose is required. Install the Docker Compose plugin or docker-compose.");
}

function runCompose(args) {
  const compose = resolveComposeCommand();
  run(compose.command, [...compose.baseArgs, ...args]);
}

function runPnpm(args) {
  if (commandExists("pnpm")) {
    run("pnpm", args);
    return;
  }

  run("corepack", ["pnpm", ...args]);
}

function redisCommand(parts) {
  return `*${parts.length}\r\n${parts.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join("")}`;
}

function pingRedis(rawUrl) {
  return new Promise((resolvePing) => {
    const url = new URL(rawUrl);
    const socket = new Socket();
    let settled = false;
    let buffer = "";

    function settle(value) {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolvePing(value);
    }

    socket.setTimeout(1000);
    socket.once("error", () => settle(false));
    socket.once("timeout", () => settle(false));
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (buffer.includes("+PONG")) {
        settle(true);
      }

      if (buffer.startsWith("-")) {
        settle(false);
      }
    });

    socket.connect(Number(url.port || 6379), url.hostname || "localhost", () => {
      const password = decodeURIComponent(url.password || "");
      if (password) {
        socket.write(redisCommand(["AUTH", password]));
      }
      socket.write(redisCommand(["PING"]));
    });
  });
}

async function waitForRedis() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (await pingRedis(redisUrl)) {
      return;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }

  throw new Error("Redis healthcheck did not become ready.");
}

function mysqlConnectionFromUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "mysql:") {
    throw new Error("DATABASE_URL must use the mysql:// protocol.");
  }

  const database = url.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include the database name.");
  }

  if (!/^[A-Za-z0-9_$]+$/.test(database)) {
    throw new Error("Database name must contain only letters, numbers, underscore or dollar sign.");
  }

  return {
    host: url.hostname || "localhost",
    port: url.port || "3306",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database
  };
}

function createDatabaseIfMissing() {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) {
    throw new Error("DATABASE_URL is required to create or migrate the database.");
  }

  if (!commandExists("mysql")) {
    throw new Error("The mysql CLI is required to create the database automatically.");
  }

  const target = mysqlConnectionFromUrl(rawDatabaseUrl);
  const admin = process.env.MYSQL_ADMIN_URL
    ? mysqlConnectionFromUrl(process.env.MYSQL_ADMIN_URL)
    : target;

  if (!admin.user) {
    throw new Error("MySQL user is required in DATABASE_URL or MYSQL_ADMIN_URL.");
  }

  const sql = `CREATE DATABASE IF NOT EXISTS \`${target.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;
  const args = [
    "--protocol=tcp",
    "--connect-timeout=10",
    "--batch",
    "--skip-column-names",
    "--host",
    admin.host,
    "--port",
    admin.port,
    "--user",
    admin.user,
    "--execute",
    sql
  ];

  console.log(`Ensuring MySQL database '${target.database}' exists on ${target.host}:${target.port}`);
  runWithEnv("mysql", args, admin.password ? { MYSQL_PWD: admin.password } : {});
}

if (!commandExists("pnpm") && !commandExists("corepack")) {
  throw new Error("pnpm or corepack is required.");
}

const envPath = resolve(root, ".env");
const envExamplePath = resolve(root, ".env.example");

if (!existsSync(envPath)) {
  copyFileSync(envExamplePath, envPath);
  console.log(".env created from .env.example");
} else {
  console.log(".env already exists; keeping current file");
}

loadRootEnv(root);

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
if (await pingRedis(redisUrl)) {
  console.log(`Redis already available at ${redisUrl}; reusing it.`);
} else {
  console.log("Starting Redis with Docker Compose. MySQL is expected to be your existing local instance.");
  runCompose(["up", "-d", "redis"]);
  await waitForRedis();
}

createDatabaseIfMissing();

console.log("Generating Prisma Client");
runPnpm(["db:generate"]);

console.log("Running Prisma migrations against DATABASE_URL");
runPnpm(["db:migrate"]);

console.log("Running development seed");
runPnpm(["db:seed"]);

console.log("Local setup completed. Run pnpm dev to start web, api and worker.");
