import type { FastifyReply, FastifyRequest } from "fastify";
import type { z, ZodSchema } from "zod";

export function parseBody<T extends ZodSchema>(
  schema: T,
  request: FastifyRequest
): z.infer<T> {
  return schema.parse(request.body);
}

export function parseParams<T extends ZodSchema>(
  schema: T,
  request: FastifyRequest
): z.infer<T> {
  return schema.parse(request.params);
}

export function parseQuery<T extends ZodSchema>(
  schema: T,
  request: FastifyRequest
): z.infer<T> {
  return schema.parse(request.query);
}

export function sendNoStore(reply: FastifyReply) {
  reply.header("Cache-Control", "no-store");
}
