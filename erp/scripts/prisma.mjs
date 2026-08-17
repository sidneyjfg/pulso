import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRootEnv } from "./env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadRootEnv(root);

const databaseRoot = resolve(root, "packages/database");
const requireFromDatabase = createRequire(resolve(databaseRoot, "package.json"));
const prismaCli = requireFromDatabase.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  cwd: databaseRoot,
  stdio: "inherit",
  env: process.env,
  shell: false
});

process.exit(result.status ?? 1);
