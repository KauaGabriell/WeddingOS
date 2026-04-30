import type { FastifyRequest } from "fastify";
import type {
  AdminPrincipal,
  GuestPrincipal,
} from "../../shared/platform/http/auth-context.js";
import type { AuthenticatedRequestGuard } from "../../shared/platform/http/auth-guards.js";
import { resolveBearerToken } from "../../shared/platform/http/access-control.js";
import { forbiddenError, unauthorizedError } from "../../shared/platform/http/http-errors.js";
import type {
  AdminSessionVerifier,
  GuestSessionVerifier,
} from "../infrastructure/session-verifiers.js";

export type GuestAuthGuard = AuthenticatedRequestGuard<GuestPrincipal>;
export type AdminAuthGuard = AuthenticatedRequestGuard<AdminPrincipal>;

function resolveAuthRequestId(request: FastifyRequest): string {
  return request.correlationId ?? request.id;
}

export function createGuestAuthGuard(verifier: GuestSessionVerifier): GuestAuthGuard {
  return async (request) => {
    const token = resolveBearerToken(request);
    const principal = await verifier.verifySession({
      token,
      requestId: resolveAuthRequestId(request),
    });

    if (!principal) {
      throw unauthorizedError("Invalid guest session");
    }

    if (principal.actorType !== "guest") {
      throw forbiddenError("Admin session cannot access guest route");
    }

    request.auth = principal;
    return principal;
  };
}

export function createAdminAuthGuard(verifier: AdminSessionVerifier): AdminAuthGuard {
  return async (request) => {
    const token = resolveBearerToken(request);
    const principal = await verifier.verifySession({
      token,
      requestId: resolveAuthRequestId(request),
    });

    if (!principal) {
      throw unauthorizedError("Invalid admin session");
    }

    if (principal.actorType !== "admin") {
      throw forbiddenError("Guest session cannot access admin route");
    }

    request.auth = principal;
    return principal;
  };
}
