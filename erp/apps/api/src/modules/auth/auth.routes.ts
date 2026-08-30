import type { FastifyInstance, FastifyReply } from "fastify";
import { adminLoginBodySchema, loginBodySchema, registerBodySchema, switchContextBodySchema } from "@erp/contracts";
import { config } from "@erp/config";
import { errors } from "@erp/security";
import { parseBody, sendNoStore } from "../../lib/zod.js";
import * as authService from "./auth.service.js";

const refreshCookieName = config.COOKIE_SECURE ? "__Host-pulso_refresh" : "pulso_refresh";
const refreshCookiePath = config.COOKIE_SECURE ? "/" : "/api/v1/auth";

function cookieDomain() {
  if (config.COOKIE_SECURE) {
    return undefined;
  }

  return config.COOKIE_DOMAIN === "localhost" ? undefined : config.COOKIE_DOMAIN;
}

function setRefreshCookie(reply: FastifyReply, refreshToken: string) {
  const domain = cookieDomain();
  reply.setCookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE,
    path: refreshCookiePath,
    ...(domain ? { domain } : {}),
    maxAge: config.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60
  });
}

function clearRefreshCookie(reply: FastifyReply) {
  const domain = cookieDomain();
  reply.clearCookie(refreshCookieName, {
    path: refreshCookiePath,
    ...(domain ? { domain } : {})
  });
}

function authResponse(input: Awaited<ReturnType<typeof authService.login>>) {
  return {
    accessToken: input.accessToken,
    tenant: input.tenant
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/api/v1/auth/register",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes",
          groupId: "auth-register"
        }
      }
    },
    async (request, reply) => {
      sendNoStore(reply);
      const body = parseBody(registerBodySchema, request);
      const result = await authService.register(body, request);
      setRefreshCookie(reply, result.refreshToken);
      return authResponse(result);
    }
  );

  app.post(
    "/api/v1/auth/login",
    {
      config: {
        rateLimit: {
          max: config.LOGIN_RATE_LIMIT_MAX,
          timeWindow: config.LOGIN_RATE_LIMIT_WINDOW,
          groupId: "auth-login"
        }
      }
    },
    async (request, reply) => {
      sendNoStore(reply);
      const body = parseBody(loginBodySchema, request);
      const result = await authService.login(body, request);
      setRefreshCookie(reply, result.refreshToken);
      return authResponse(result);
    }
  );

  app.post(
    "/api/admin/auth/login",
    {
      config: {
        rateLimit: {
          max: config.LOGIN_RATE_LIMIT_MAX,
          timeWindow: config.LOGIN_RATE_LIMIT_WINDOW,
          groupId: "admin-login"
        }
      }
    },
    async (request, reply) => {
      sendNoStore(reply);
      const body = parseBody(adminLoginBodySchema, request);
      return authService.adminLogin(body, request);
    }
  );

  app.post(
    "/api/v1/auth/refresh",
    {
      config: {
        rateLimit: {
          max: config.LOGIN_RATE_LIMIT_MAX,
          timeWindow: config.LOGIN_RATE_LIMIT_WINDOW,
          groupId: "auth-refresh"
        }
      }
    },
    async (request, reply) => {
    sendNoStore(reply);
    const refreshToken = request.cookies[refreshCookieName];
    if (!refreshToken) {
      clearRefreshCookie(reply);
      throw errors.unauthorized();
    }

    const result = await authService.refresh(refreshToken);
    setRefreshCookie(reply, result.refreshToken);
    return authResponse(result);
    }
  );

  app.post("/api/v1/auth/context", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    sendNoStore(reply);
    const body = parseBody(switchContextBodySchema, request);
    return authService.switchContext(request.tenant!.userId, request.tenant!.sessionId, body);
  });

  app.post("/api/v1/auth/logout", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    sendNoStore(reply);
    await authService.logout(request.tenant!.sessionId);
    clearRefreshCookie(reply);
    return reply.status(204).send();
  });
}
