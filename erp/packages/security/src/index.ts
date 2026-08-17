import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AppConfig } from "@erp/config";

export type TokenType =
  | "USER_ACCESS"
  | "ADMIN_ACCESS"
  | "REFRESH"
  | "PASSWORD_RESET"
  | "EMAIL_VERIFICATION"
  | "INTEGRATION";

export type TenantContext = {
  userId: string;
  organizationId: string;
  companyId: string;
  branchId: string;
  role: string;
  permissions: string[];
  sessionId: string;
};

export type UserAccessTokenPayload = TenantContext & {
  tokenType: "USER_ACCESS";
};

export type AdminAccessTokenPayload = {
  userId: string;
  sessionId: string;
  tokenType: "ADMIN_ACCESS";
  permissions: string[];
};

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export const errors = {
  unauthorized: () => new AppError("UNAUTHORIZED", "Faça login para continuar.", 401),
  forbidden: () => new AppError("FORBIDDEN", "Você não tem acesso a esta ação.", 403),
  invalidTokenType: () => new AppError("INVALID_TOKEN_TYPE", "Token inválido para esta ação.", 401),
  invalidTenant: () => new AppError("INVALID_TENANT", "Empresa ou loja inválida para este usuário.", 403),
  invalidCredentials: () => new AppError("INVALID_CREDENTIALS", "E-mail ou senha inválidos.", 401),
  inactiveUser: () => new AppError("INACTIVE_USER", "Este usuário está inativo.", 403),
  notFound: (code = "NOT_FOUND", message = "Registro não encontrado.") => new AppError(code, message, 404),
  conflict: (code = "CONFLICT", message = "Já existe um registro com estes dados.") => new AppError(code, message, 409)
};

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signUserAccessToken(config: AppConfig, payload: UserAccessTokenPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(config.JWT_USER_ISSUER)
    .setAudience(config.JWT_USER_AUDIENCE)
    .setExpirationTime(config.JWT_USER_EXPIRES_IN)
    .setIssuedAt()
    .sign(secretKey(config.JWT_USER_SECRET));
}

export async function signAdminAccessToken(config: AppConfig, payload: AdminAccessTokenPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(config.JWT_ADMIN_ISSUER)
    .setAudience(config.JWT_ADMIN_AUDIENCE)
    .setExpirationTime(config.JWT_ADMIN_EXPIRES_IN)
    .setIssuedAt()
    .sign(secretKey(config.JWT_ADMIN_SECRET));
}

export async function verifyUserAccessToken(config: AppConfig, token: string) {
  let result: { payload: Record<string, unknown> };
  try {
    result = await jwtVerify(token, secretKey(config.JWT_USER_SECRET), {
      issuer: config.JWT_USER_ISSUER,
      audience: config.JWT_USER_AUDIENCE
    });
  } catch {
    throw errors.unauthorized();
  }

  if (result.payload.tokenType !== "USER_ACCESS") {
    throw errors.invalidTokenType();
  }

  return result.payload as unknown as UserAccessTokenPayload;
}

export async function verifyAdminAccessToken(config: AppConfig, token: string) {
  let result: { payload: Record<string, unknown> };
  try {
    result = await jwtVerify(token, secretKey(config.JWT_ADMIN_SECRET), {
      issuer: config.JWT_ADMIN_ISSUER,
      audience: config.JWT_ADMIN_AUDIENCE
    });
  } catch {
    throw errors.unauthorized();
  }

  if (result.payload.tokenType !== "ADMIN_ACCESS") {
    throw errors.invalidTokenType();
  }

  return result.payload as unknown as AdminAccessTokenPayload;
}

export function createOpaqueRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function assertPermission(context: TenantContext, permission: string) {
  if (!context.permissions.includes(permission)) {
    throw errors.forbidden();
  }
}
