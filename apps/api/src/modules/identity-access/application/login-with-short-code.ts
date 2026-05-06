import type { GuestRepository, InviteTokenRepository } from "../domain/index.js";
import type { InviteTokenConsumptionTransactionRunner } from "../infrastructure/index.js";
import type { AuditLogWriter } from "../../admin-backoffice/application/audit-log-writer.js";
import {
  authenticateGuestWithInviteToken,
  type GuestAuthenticationResult,
} from "./guest-invite-authentication-core.js";

export interface LoginGuestWithShortCodeInput {
  readonly code: string;
  readonly requestId?: string;
}

export type LoginGuestWithShortCodeResult = GuestAuthenticationResult;

export interface LoginGuestWithShortCodeDependencies {
  readonly inviteTokenRepository: InviteTokenRepository;
  readonly guestRepository: GuestRepository;
  readonly inviteTokenConsumptionTransactionRunner: InviteTokenConsumptionTransactionRunner;
  readonly auditLogWriter: AuditLogWriter;
  readonly now?: () => Date;
}

export interface LoginGuestWithShortCodeUseCase {
  execute(input: LoginGuestWithShortCodeInput): Promise<LoginGuestWithShortCodeResult>;
}

export function createLoginGuestWithShortCodeUseCase(
  dependencies: LoginGuestWithShortCodeDependencies,
): LoginGuestWithShortCodeUseCase {
  return {
    async execute(input) {
      const result = await authenticateGuestWithInviteToken(
        () => dependencies.inviteTokenRepository.findByShortCode(input.code),
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
