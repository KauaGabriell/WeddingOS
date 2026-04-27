import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { FastifyReply, FastifyRequest } from "fastify";
import { REQUEST_ID_HEADER } from "../logging/create-api-logger.js";

declare module "fastify" {
  interface FastifyRequest {
    correlationId: string;
  }
}

function resolveRequestId(request: IncomingMessage): string {
  const headerValue = request.headers[REQUEST_ID_HEADER];

  if (Array.isArray(headerValue)) {
    return headerValue[0] ?? randomUUID();
  }

  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue;
  }

  return randomUUID();
}

export async function attachRequestContext(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const correlationId = request.id;

  request.correlationId = correlationId;
  reply.header(REQUEST_ID_HEADER, correlationId);
}

export async function logRequestCompletion(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  request.log.info(
    {
      requestId: request.correlationId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    },
    "request completed",
  );
}

export const requestContextConfig = {
  genReqId: resolveRequestId,
  requestIdHeader: REQUEST_ID_HEADER,
  requestIdLogLabel: "requestId",
};
