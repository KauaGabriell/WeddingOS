export const AUTHENTICATED_ACTOR_TYPES = ["guest", "admin"] as const;
export type AuthenticatedActorType = (typeof AUTHENTICATED_ACTOR_TYPES)[number];

export const ACCESS_LEVELS = ["public", "guest", "admin"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export interface GuestPrincipal {
  readonly actorType: "guest";
  readonly guestId: string;
  readonly guestGroupId: string;
}

export interface AdminPrincipal {
  readonly actorType: "admin";
  readonly adminUserId: string;
  readonly role: string;
}

export type AuthenticatedPrincipal = GuestPrincipal | AdminPrincipal;

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthenticatedPrincipal;
  }

  interface FastifyContextConfig {
    access?: AccessLevel;
  }
}
