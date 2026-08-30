import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const smoke = process.argv.includes("--smoke");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...options.env }
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function output(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, ...options.env }
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `${command} ${args.join(" ")} failed`);
  }

  return result.stdout;
}

function prodComposeServiceBlocks() {
  const config = output("docker-compose", ["-f", "docker-compose.prod.yml", "config"]);
  const servicesIndex = config.indexOf("services:");
  if (servicesIndex === -1) {
    throw new Error("docker-compose.prod.yml does not define services");
  }

  const blocks = new Map();
  let currentService = null;
  let currentLines = [];
  for (const line of config.slice(servicesIndex).split(/\r?\n/)) {
    const serviceMatch = line.match(/^  ([a-zA-Z0-9_-]+):\s*$/);
    if (serviceMatch) {
      if (currentService) {
        blocks.set(currentService, currentLines.join("\n"));
      }
      currentService = serviceMatch[1];
      currentLines = [line];
      continue;
    }
    if (currentService) {
      currentLines.push(line);
    }
  }
  if (currentService) {
    blocks.set(currentService, currentLines.join("\n"));
  }
  return blocks;
}

function lastDockerfileUser(path) {
  const content = readFileSync(resolve(root, path), "utf8");
  const fromLines = content.match(/^FROM\s+\S+/gim) ?? [];
  for (const fromLine of fromLines) {
    const image = fromLine.split(/\s+/)[1];
    if (!image.includes(":") || image.endsWith(":latest")) {
      throw new Error(`${path} must pin base image versions and avoid latest`);
    }
  }

  const users = content.match(/^USER\s+(.+)$/gim) ?? [];
  return users.at(-1)?.replace(/^USER\s+/i, "").trim();
}

function runDockerProductionCheck() {
  const compose = readFileSync(resolve(root, "docker-compose.prod.yml"), "utf8");
  if (compose.includes("privileged: true")) {
    throw new Error("docker-compose.prod.yml must not use privileged containers");
  }
  if (compose.includes("/var/run/docker.sock")) {
    throw new Error("docker-compose.prod.yml must not mount the Docker socket");
  }
  if (!compose.includes("ghcr.io/")) {
    throw new Error("docker-compose.prod.yml must default to GHCR images");
  }
  if (!compose.includes("# build:")) {
    throw new Error("docker-compose.prod.yml must document the internal build mode");
  }

  const serviceBlocks = prodComposeServiceBlocks();
  for (const service of ["api", "web", "worker"]) {
    const block = serviceBlocks.get(service);
    if (!block) {
      throw new Error(`docker-compose.prod.yml is missing ${service}`);
    }
    if (/container_name:/i.test(block)) {
      throw new Error(`${service} must not set container_name; it prevents scaling`);
    }
    if (/\n\s+ports:/i.test(block)) {
      throw new Error(`${service} must not publish host ports directly; proxy owns public ingress`);
    }
  }

  const proxy = serviceBlocks.get("proxy");
  if (!proxy || !/\n\s+ports:/i.test(proxy)) {
    throw new Error("proxy must be the only public ingress service");
  }

  for (const dockerfile of ["docker/Dockerfile.api", "docker/Dockerfile.worker", "docker/Dockerfile.web"]) {
    const user = lastDockerfileUser(dockerfile);
    if (!user || user === "root" || user === "0") {
      throw new Error(`${dockerfile} must finish with a non-root USER`);
    }
  }
}

async function request(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:3333${path}`, options);
  const text = await response.text();
  return { response, text };
}

async function waitForReady() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const { response } = await request("/ready");
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("API did not become ready");
}

async function runSmoke() {
  const api = spawn("./node_modules/.bin/tsx", ["apps/api/src/server.ts"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      LOGIN_RATE_LIMIT_MAX: "2",
      LOGIN_RATE_LIMIT_WINDOW: "1m"
    }
  });

  try {
    await waitForReady();

    const health = await request("/health");
    if (!health.response.ok) {
      throw new Error(`/health failed with ${health.response.status}`);
    }

    const loginBody = JSON.stringify({
      email: "rate-limit@test.local",
      password: "senha-incorreta"
    });
    const loginOptions = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: loginBody
    };

    const first = await request("/api/v1/auth/login", loginOptions);
    const second = await request("/api/v1/auth/login", loginOptions);
    const third = await request("/api/v1/auth/login", loginOptions);

    if (first.response.status !== 401 || second.response.status !== 401 || third.response.status !== 429) {
      throw new Error(`Unexpected rate limit sequence: ${first.response.status}, ${second.response.status}, ${third.response.status}`);
    }
  } finally {
    api.kill("SIGTERM");
  }
}

run("./node_modules/.bin/tsc", ["-p", "apps/api/tsconfig.json", "--noEmit"]);
run("./node_modules/.bin/tsc", ["-p", "apps/worker/tsconfig.json", "--noEmit"]);
run("./node_modules/.bin/tsc", ["-p", "apps/web/tsconfig.json", "--noEmit"]);
run("docker-compose", ["config", "--quiet"]);
run("docker-compose", ["-f", "docker-compose.prod.yml", "config", "--quiet"]);
runDockerProductionCheck();

if (smoke) {
  await runSmoke();
}

console.log(smoke ? "production checks and smoke passed" : "production checks passed");
