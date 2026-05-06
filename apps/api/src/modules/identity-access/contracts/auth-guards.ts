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
import { DEFAULT_GUEST_SESSION_COOKIE_NAME } from "../infrastructure/guest-session.js";

export type GuestAuthGuard = AuthenticatedRequestGuard<GuestPrincipal>;
export type AdminAuthGuard = AuthenticatedRequestGuard<AdminPrincipal>;

function resolveAuthRequestId(request: FastifyRequest): string {
  return request.correlationId ?? request.id;
}

function resolveCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) {
    return null;
  }

  for (const rawPart of cookieHeader.split(";")) {
    const part = rawPart.trim();

    if (!part.startsWith(`${name}=`)) {
      continue;
    }

    const value = part.slice(name.length + 1).trim();
    return value.length > 0 ? decodeURIComponent(value) : null;
  }

  return null;
}

function resolveGuestSessionToken(request: FastifyRequest): string {
  try {
    return resolveBearerToken(request);
  } catch (error) {
    const cookieHeader = Array.isArray(request.headers.cookie)
      ? request.headers.cookie[0]
      : request.headers.cookie;
    const cookieToken = resolveCookieValue(cookieHeader, DEFAULT_GUEST_SESSION_COOKIE_NAME);

    if (cookieToken) {
      return cookieToken;
    }

    throw error;
  }
}

export function createGuestAuthGuard(verifier: GuestSessionVerifier): GuestAuthGuard {
  return createGuestAuthGuardWithFallback(verifier);
}

export function createGuestAuthGuardWithFallback(
  verifier: GuestSessionVerifier,
  adminVerifier?: AdminSessionVerifier,
): GuestAuthGuard {
  return async (request) => {
    const token = resolveGuestSessionToken(request);
    const principal =
      (await verifier.verifySession({
        token,
        requestId: resolveAuthRequestId(request),
      })) ??
      (adminVerifier
        ? await adminVerifier.verifySession({
            token,
            requestId: resolveAuthRequestId(request),
          })
        : null);

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

export function createGuestAuthGuardLegacy(verifier: GuestSessionVerifier): GuestAuthGuard {
  return async (request) => {
    const token = resolveGuestSessionToken(request);
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
