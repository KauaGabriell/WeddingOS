import type { InviteToken, InviteTokenStatus } from "./entities/invite-token.js";

export type InviteTokenLifecycleStatus = InviteTokenStatus;

export interface InviteTokenConsumptionOptions {
  readonly consumedAt?: Date;
}

export interface RevokeInviteTokenInput {
  readonly reason: string;
  readonly revokedAt?: Date;
}

export interface MarkInviteTokenAsUsedInput {
  readonly inviteTokenId: string;
  readonly usedAt?: Date;
}

export interface RevokeInviteTokenRepositoryInput {
  readonly inviteTokenId: string;
  readonly reason: string;
  readonly revokedAt?: Date;
}

export function isInviteTokenExpired(inviteToken: InviteToken, now = new Date()): boolean {
  return inviteToken.expiresAt.getTime() <= now.getTime();
}

export function isInviteTokenRevoked(inviteToken: InviteToken): boolean {
  return inviteToken.status === "revoked" || inviteToken.revokedAt !== null;
}

export function isInviteTokenUsed(inviteToken: InviteToken): boolean {
  return inviteToken.status === "used" || inviteToken.usedAt !== null;
}

export function resolveInviteTokenLifecycleStatus(
  inviteToken: InviteToken,
  now = new Date(),
): InviteTokenLifecycleStatus {
  if (isInviteTokenRevoked(inviteToken)) {
    return "revoked";
  }

  if (isInviteTokenUsed(inviteToken)) {
    return "used";
  }

  if (isInviteTokenExpired(inviteToken, now)) {
    return "expired";
  }

  return "issued";
}

export function canConsumeInviteToken(inviteToken: InviteToken, now = new Date()): boolean {
  return resolveInviteTokenLifecycleStatus(inviteToken, now) === "issued";
}

export class InvalidInviteTokenConsumptionError extends Error {
  readonly inviteTokenId: string;
  readonly lifecycleStatus: InviteTokenLifecycleStatus;
  readonly statusCode = 401;

  constructor(inviteTokenId: string, lifecycleStatus: InviteTokenLifecycleStatus) {
    super(`Invite token cannot be consumed because it is ${lifecycleStatus}`);
    this.name = "InvalidInviteTokenConsumptionError";
    this.inviteTokenId = inviteTokenId;
    this.lifecycleStatus = lifecycleStatus;
  }
}

export function consumeInviteToken(
  inviteToken: InviteToken,
  options: InviteTokenConsumptionOptions = {},
): InviteToken {
  const consumedAt = options.consumedAt ?? new Date();
  const lifecycleStatus = resolveInviteTokenLifecycleStatus(inviteToken, consumedAt);

  if (lifecycleStatus !== "issued") {
    throw new InvalidInviteTokenConsumptionError(inviteToken.id, lifecycleStatus);
  }

  return {
    ...inviteToken,
    status: "used",
    usedAt: consumedAt,
    updatedAt: consumedAt,
  };
}

export function revokeInviteToken(
  inviteToken: InviteToken,
  input: RevokeInviteTokenInput,
): InviteToken {
  const reason = input.reason.trim();

  if (reason.length === 0) {
    throw new TypeError("Invite token revocation reason is required");
  }

  const revokedAt = input.revokedAt ?? new Date();

  return {
    ...inviteToken,
    status: "revoked",
    revokedAt,
    revokedReason: reason,
    updatedAt: revokedAt,
  };
}
