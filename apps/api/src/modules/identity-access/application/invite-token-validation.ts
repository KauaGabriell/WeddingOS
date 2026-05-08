import {
  resolveInviteTokenLifecycleStatus,
  type InviteToken,
  type InviteTokenLifecycleStatus,
} from "../domain/index.js";

export type InviteTokenValidationFailureReason = "not_found" | "expired" | "used" | "revoked";

export interface InviteTokenValidationSuccess {
  readonly ok: true;
  readonly inviteToken: InviteToken;
  readonly lifecycleStatus: InviteTokenLifecycleStatus;
}

export interface InviteTokenValidationFailure {
  readonly ok: false;
  readonly reason: InviteTokenValidationFailureReason;
  readonly lifecycleStatus: InviteTokenLifecycleStatus | null;
  readonly inviteToken?: InviteToken;
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
  options: { readonly allowedStatuses?: readonly InviteTokenLifecycleStatus[] } = {},
): InviteTokenValidationResult {
  const allowedStatuses = options.allowedStatuses ?? ["issued"];

  if (inviteToken === null) {
    return {
      ok: false,
      reason: "not_found",
      lifecycleStatus: null,
    };
  }

  const lifecycleStatus = resolveInviteTokenLifecycleStatus(inviteToken, now);

  if (!allowedStatuses.includes(lifecycleStatus)) {
    return {
      ok: false,
      reason: lifecycleStatus as InviteTokenValidationFailureReason,
      lifecycleStatus,
      inviteToken,
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
  options: { readonly allowedStatuses?: readonly InviteTokenLifecycleStatus[] } = {},
): InviteToken {
  const validationResult = validateInviteToken(inviteToken, now, options);

  if (!validationResult.ok) {
    throw new InviteTokenValidationError(validationResult);
  }

  return validationResult.inviteToken;
}
