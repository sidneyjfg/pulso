import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { cwd } from "node:process";
import { z } from "zod";

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  const rawValue = trimmed.slice(separatorIndex + 1).trim();
  const value = rawValue.replace(/^["']|["']$/g, "");

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  return { key, value };
}

function findNearestEnvFile(startDirectory: string) {
  let current = startDirectory;
  const root = parse(current).root;

  while (true) {
    const candidate = join(current, ".env");
    if (existsSync(candidate)) {
      return candidate;
    }

    if (current === root) {
      return null;
    }

    current = dirname(current);
  }
}

function loadNearestEnv() {
  const envPath = findNearestEnvFile(cwd());
  if (!envPath) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (parsed && process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

loadNearestEnv();

const booleanString = z
  .string()
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().min(1).default("ERP"),
  APP_ENV: z.string().min(1).default("local"),
  WEB_URL: z.string().url(),
  API_HOST: z.string().min(1).default("localhost"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  API_URL: z.string().url(),
  CORS_ORIGINS: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_USER_SECRET: z.string().min(32),
  JWT_USER_ISSUER: z.string().min(1),
  JWT_USER_AUDIENCE: z.literal("erp-user-api"),
  JWT_USER_EXPIRES_IN: z.string().min(1),
  JWT_ADMIN_SECRET: z.string().min(32),
  JWT_ADMIN_ISSUER: z.string().min(1),
  JWT_ADMIN_AUDIENCE: z.literal("erp-admin-api"),
  JWT_ADMIN_EXPIRES_IN: z.string().min(1),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: z.string().min(1),
  COOKIE_SECURE: booleanString.default("false"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  DATA_ENCRYPTION_KEY: z.string().min(32),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().min(1).default("1m"),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  LOGIN_RATE_LIMIT_WINDOW: z.string().min(1).default("15m"),
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().min(1).default("./storage"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  IFOOD_ENABLED: booleanString.default("false"),
  FOOD99_ENABLED: booleanString.default("false"),
  DEV_SEED: booleanString.default("false"),
  DEV_ADMIN_EMAIL: z.string().email(),
  DEV_ADMIN_PASSWORD: z.string().min(10),
  DEV_ORGANIZATION_NAME: z.string().min(1),
  DEV_COMPANY_NAME: z.string().min(1),
  DEV_BRANCH_NAME: z.string().min(1)
});

export type AppConfig = z.infer<typeof envSchema>;

const developmentDefaults = [
  "local_user_secret_change_in_production_0123456789abcdef",
  "local_admin_secret_change_in_production_abcdef9876543210",
  "local_encryption_key_change_in_production_0123456789abcdef"
];

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = envSchema.parse(source);

  if (config.JWT_USER_SECRET === config.JWT_ADMIN_SECRET) {
    throw new Error("JWT_USER_SECRET and JWT_ADMIN_SECRET must be different.");
  }

  if (config.NODE_ENV === "production") {
    const hasDevelopmentSecret =
      developmentDefaults.includes(config.JWT_USER_SECRET) ||
      developmentDefaults.includes(config.JWT_ADMIN_SECRET) ||
      developmentDefaults.includes(config.DATA_ENCRYPTION_KEY);

    if (hasDevelopmentSecret) {
      throw new Error("Production startup refused: development secrets detected.");
    }

    if (config.DEV_SEED) {
      throw new Error("Production startup refused: DEV_SEED cannot be true.");
    }

    if (!config.COOKIE_SECURE) {
      throw new Error("Production startup refused: COOKIE_SECURE must be true.");
    }
  }

  return config;
}

export const config = loadConfig();
