import pino, { type DestinationStream, type Logger } from "pino";

export const REQUEST_ID_HEADER = "x-request-id";

type CreateApiLoggerOptions = {
  level?: string;
  stream?: DestinationStream;
};

const SENSITIVE_HEADERS = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-forwarded-access-token",
];

function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> | undefined {
  const sanitizedEntries = Object.entries(headers).filter(([name, value]) => {
    if (value === undefined) {
      return false;
    }

    return !SENSITIVE_HEADERS.includes(name.toLowerCase());
  });

  if (sanitizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(sanitizedEntries);
}

export function createApiLogger(options: CreateApiLoggerOptions = {}): Logger {
  return pino(
    {
      level: options.level ?? "info",
      messageKey: "message",
      base: {
        service: "weddingos-api",
      },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers.set-cookie",
          "req.headers.x-api-key",
          "req.headers.x-auth-token",
          "req.headers.x-forwarded-access-token",
          "res.headers.set-cookie",
          "err.config.headers.authorization",
          "err.config.headers.cookie",
          "err.config.headers.x-api-key",
          "config.headers.authorization",
          "config.headers.cookie",
          "config.headers.x-api-key",
        ],
        remove: true,
      },
      serializers: {
        req(request) {
          return {
            requestId: request.id,
            method: request.method,
            url: request.url,
            headers: sanitizeHeaders(request.headers),
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode,
          };
        },
        err(error) {
          return {
            type: error.name,
            message: error.message,
            stack: error.stack,
          };
        },
      },
    },
    options.stream,
  );
}
