import { spawnSync } from "node:child_process";

function commandEnv() {
  return {
    ...process.env,
    COREPACK_HOME: process.env.COREPACK_HOME ?? "/tmp/corepack",
    XDG_DATA_HOME: process.env.XDG_DATA_HOME ?? "/tmp/pnpm-data",
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? "/tmp/cache",
    PNPM_HOME: process.env.PNPM_HOME ?? "/tmp/pnpm-home"
  };
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

const compose = resolveComposeCommand();
const args = [...compose.baseArgs, ...process.argv.slice(2)];
const result = spawnSync(compose.command, args, {
  stdio: "inherit",
  shell: false,
  env: commandEnv()
});

process.exit(result.status ?? 1);
