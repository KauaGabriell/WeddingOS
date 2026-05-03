import {
  resolveInviteTokenLifecycleStatus,
  type InviteToken,
  type InviteTokenLifecycleStatus,
} from "../domain/index.js";

export type InviteTokenValidationFailureReason = "not_found" | "expired" | "used" | "revoked";

export interface InviteTokenValidationSuccess {
  readonly ok: true;
  readonly inviteToken: InviteToken;
  readonly lifecycleStatus: "issued";
}

export interface InviteTokenValidationFailure {
  readonly ok: false;
  readonly reason: InviteTokenValidationFailureReason;
  readonly lifecycleStatus: InviteTokenLifecycleStatus | null;
}

export type InviteTokenValidationResult =
  | InviteTokenValidationSuccess
  | InviteTokenValidationFailure;

export class InviteTokenValidationError extends Error {
  readonly reason: InviteTokenValidationFailureReason;
  readonly lifecycleStatus: InviteTokenLifecycleStatus | null;
  readonly statusCode = 401;

  constructor(result: InviteTokenValidationFailure) {
    super(`Invite token validation failed: ${result.reason}`);
    this.name = "InviteTokenValidationError";
    this.reason = result.reason;
    this.lifecycleStatus = result.lifecycleStatus;
  }
}

export function validateInviteToken(
  inviteToken: InviteToken | null,
  now = new Date(),
): InviteTokenValidationResult {
  if (inviteToken === null) {
    return {
      ok: false,
      reason: "not_found",
      lifecycleStatus: null,
    };
  }

  const lifecycleStatus = resolveInviteTokenLifecycleStatus(inviteToken, now);

  if (lifecycleStatus !== "issued") {
    return {
      ok: false,
      reason: lifecycleStatus,
      lifecycleStatus,
    };
  }

  return {
    ok: true,
    inviteToken,
    lifecycleStatus,
  };
}

export function assertInviteTokenIsUsable(
  inviteToken: InviteToken | null,
  now = new Date(),
): InviteToken {
  const validationResult = validateInviteToken(inviteToken, now);

  if (!validationResult.ok) {
    throw new InviteTokenValidationError(validationResult);
  }

  return validationResult.inviteToken;
}
