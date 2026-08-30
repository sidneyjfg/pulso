import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError } from "@erp/security";

function isPrismaKnownError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

function statusCodeFromError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    return error.statusCode;
  }

  return null;
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Requisicao invalida.";
}

export async function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error, correlationId: request.correlationId }, "request failed");

    if (error instanceof ZodError) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Revise os campos informados.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message
      });
    }

    if (isPrismaKnownError(error) && error.code === "P2002") {
      return reply.status(409).send({
        code: "CONFLICT",
        message: "Já existe um registro com estes dados."
      });
    }

    const statusCode = statusCodeFromError(error);
    if (statusCode) {
      return reply.status(statusCode).send({
        code: statusCode === 429 ? "RATE_LIMIT_EXCEEDED" : "REQUEST_ERROR",
        message: statusCode === 429 ? "Muitas tentativas. Aguarde antes de tentar novamente." : messageFromError(error)
      });
    }

    return reply.status(500).send({
      code: "INTERNAL_ERROR",
      message: "Não foi possível concluir a ação agora."
    });
  });
}
