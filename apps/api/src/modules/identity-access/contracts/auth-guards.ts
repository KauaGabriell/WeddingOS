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

function resolveGuestSessionTokens(request: FastifyRequest): {
  bearerToken: string | null;
  cookieToken: string | null;
} {
  const cookieHeader = Array.isArray(request.headers.cookie)
    ? request.headers.cookie[0]
    : request.headers.cookie;
  const cookieToken = resolveCookieValue(cookieHeader, DEFAULT_GUEST_SESSION_COOKIE_NAME);

  try {
    return {
      bearerToken: resolveBearerToken(request),
      cookieToken,
    };
  } catch {
    return {
      bearerToken: null,
      cookieToken,
    };
  }
}

function assertGuestSessionTokenAvailable(tokens: {
  bearerToken: string | null;
  cookieToken: string | null;
}): string {
  if (tokens.bearerToken) {
    return tokens.bearerToken;
  }

  if (tokens.cookieToken) {
    return tokens.cookieToken;
  }

  throw unauthorizedError("Missing guest session");
}

export function createGuestAuthGuard(verifier: GuestSessionVerifier): GuestAuthGuard {
  return createGuestAuthGuardWithFallback(verifier);
}

export function createGuestAuthGuardWithFallback(
  verifier: GuestSessionVerifier,
  adminVerifier?: AdminSessionVerifier,
): GuestAuthGuard {
  return async (request) => {
    const requestId = resolveAuthRequestId(request);
    const tokens = resolveGuestSessionTokens(request);
    const primaryToken = assertGuestSessionTokenAvailable(tokens);
    let principal =
      (await verifier.verifySession({
        token: primaryToken,
        requestId,
      })) ??
      (adminVerifier
        ? await adminVerifier.verifySession({
            token: primaryToken,
            requestId,
          })
        : null);

    if (
      principal === null &&
      tokens.cookieToken &&
      tokens.cookieToken !== primaryToken
    ) {
      principal =
        (await verifier.verifySession({
          token: tokens.cookieToken,
          requestId,
        })) ??
        (adminVerifier
          ? await adminVerifier.verifySession({
              token: tokens.cookieToken,
              requestId,
            })
          : null);
    }

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
    const requestId = resolveAuthRequestId(request);
    const tokens = resolveGuestSessionTokens(request);
    const primaryToken = assertGuestSessionTokenAvailable(tokens);
    let principal = await verifier.verifySession({
      token: primaryToken,
      requestId,
    });

    if (principal === null && tokens.cookieToken && tokens.cookieToken !== primaryToken) {
      principal = await verifier.verifySession({
        token: tokens.cookieToken,
        requestId,
      });
    }

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
