import type { FastifyRequest } from "fastify";
import type { AccessLevel } from "./auth-context.js";
import { unauthorizedError } from "./http-errors.js";

export interface AccessControlledRouteConfig {
  readonly config: {
    readonly access: AccessLevel;
  };
}

function defineRouteAccess(access: AccessLevel): AccessControlledRouteConfig {
  return {
    config: {
      access,
    },
  };
}

export function publicRoute(): AccessControlledRouteConfig {
  return defineRouteAccess("public");
}

export function guestRoute(): AccessControlledRouteConfig {
  return defineRouteAccess("guest");
}

export function adminRoute(): AccessControlledRouteConfig {
  return defineRouteAccess("admin");
}

export function resolveBearerToken(request: Pick<FastifyRequest, "headers">): string {
  const authorizationHeader = request.headers.authorization;
  const authorizationValue = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;

  if (typeof authorizationValue !== "string") {
    throw unauthorizedError("Missing bearer token");
  }

  const match = authorizationValue.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw unauthorizedError("Malformed bearer token");
  }

  return token;
}
