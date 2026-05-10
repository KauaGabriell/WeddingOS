import type { GuestRepository, InviteTokenRepository } from "../domain/index.js";
import type { InviteTokenConsumptionTransactionRunner } from "../infrastructure/index.js";
import type { AuditLogWriter } from "../../admin-backoffice/application/audit-log-writer.js";
import {
  authenticateGuestWithInviteToken,
  GuestInviteTokenAuthenticationError,
  type GuestAuthenticationResult,
} from "./guest-invite-authentication-core.js";

export { GuestInviteTokenAuthenticationError } from "./guest-invite-authentication-core.js";

export interface LoginGuestWithInviteTokenInput {
  readonly token: string;
  readonly requestId?: string;
}

export type LoginGuestWithInviteTokenResult = GuestAuthenticationResult;

export interface LoginGuestWithInviteTokenDependencies {
  readonly inviteTokenRepository: InviteTokenRepository;
  readonly guestRepository: GuestRepository;
  readonly inviteTokenConsumptionTransactionRunner: InviteTokenConsumptionTransactionRunner;
  readonly auditLogWriter: AuditLogWriter;
  readonly now?: () => Date;
}

export interface LoginGuestWithInviteTokenUseCase {
  execute(input: LoginGuestWithInviteTokenInput): Promise<LoginGuestWithInviteTokenResult>;
}

export function createLoginGuestWithInviteTokenUseCase(
  dependencies: LoginGuestWithInviteTokenDependencies,
): LoginGuestWithInviteTokenUseCase {
  return {
    async execute(input) {
      const result = await authenticateGuestWithInviteToken(
        () => dependencies.inviteTokenRepository.findByTokenHash(input.token),
        dependencies,
      );

      await dependencies.auditLogWriter.write({
        entityType: "guest",
        entityId: result.guestId,
        actionType: "GUEST_LOGGED_IN",
        actorType: "guest",
        actorGuestId: result.guestId,
        requestId: input.requestId,
        metadata: {
          guestGroupId: result.guestGroupId,
          inviteTokenId: result.inviteTokenId,
        },
      });

      return result;
    },
  };
}
