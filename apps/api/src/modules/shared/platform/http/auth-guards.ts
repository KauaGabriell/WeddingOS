import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import type { AdminPrincipal, AuthenticatedPrincipal, GuestPrincipal } from "./auth-context.js";

export type AuthenticatedRequestGuard<
  TPrincipal extends AuthenticatedPrincipal = AuthenticatedPrincipal,
> = (request: FastifyRequest) => Promise<TPrincipal>;

export async function allowPublicAccess(request: FastifyRequest): Promise<void> {
  request.auth = undefined;
}

export function requireGuestAuth(
  guard: AuthenticatedRequestGuard<GuestPrincipal>,
): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    await guard(request);
  };
}

export function requireAdminAuth(
  guard: AuthenticatedRequestGuard<AdminPrincipal>,
): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    await guard(request);
  };
}
