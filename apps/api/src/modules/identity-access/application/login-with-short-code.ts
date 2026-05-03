import type { GuestRepository, InviteTokenRepository } from "../domain/index.js";
import type { InviteTokenConsumptionTransactionRunner } from "../infrastructure/index.js";
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
      return authenticateGuestWithInviteToken(
        () => dependencies.inviteTokenRepository.findByShortCode(input.code),
        dependencies,
      );
    },
  };
}
