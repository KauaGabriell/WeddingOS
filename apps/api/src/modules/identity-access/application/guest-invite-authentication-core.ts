import {
  type Guest,
  type GuestRepository,
  type InviteToken,
} from "../domain/index.js";
import type { InviteTokenConsumptionTransactionRunner } from "../infrastructure/index.js";
import {
  assertInviteTokenIsUsable,
  InviteTokenValidationError,
} from "./invite-token-validation.js";

export interface GuestAuthenticationResult {
  readonly guestId: string;
  readonly guestGroupId: string;
  readonly inviteTokenId: string;
  readonly authenticatedAt: Date;
}

export class GuestInviteTokenAuthenticationError extends Error {
  readonly statusCode = 401;

  constructor(message = "Invalid guest invite token") {
    super(message);
    this.name = "GuestInviteTokenAuthenticationError";
  }
}

export interface AuthenticateGuestWithInviteTokenDependencies {
  readonly guestRepository: GuestRepository;
  readonly inviteTokenConsumptionTransactionRunner: InviteTokenConsumptionTransactionRunner;
  readonly now?: () => Date;
}

export type InviteTokenResolver = () => Promise<InviteToken | null>;

async function resolveAuthenticatedGuest(
  inviteToken: InviteToken,
  guestRepository: GuestRepository,
): Promise<Guest | null> {
  if (inviteToken.guestId) {
    return guestRepository.findById(inviteToken.guestId);
  }

  if (inviteToken.guestGroupId) {
    return guestRepository.findPrimaryByGroupId(inviteToken.guestGroupId);
  }

  return null;
}

function assertGuestEligible(guest: Guest | null): Guest {
  if (guest === null || guest.status !== "active") {
    throw new GuestInviteTokenAuthenticationError();
  }

  return guest;
}

export async function authenticateGuestWithInviteToken(
  resolveInviteToken: InviteTokenResolver,
  dependencies: AuthenticateGuestWithInviteTokenDependencies,
  options: { readonly consumeInviteToken?: boolean } = {},
): Promise<GuestAuthenticationResult> {
  const now = dependencies.now?.() ?? new Date();
  const shouldConsumeInviteToken = options.consumeInviteToken ?? true;
  let inviteToken: InviteToken;

  try {
    inviteToken = assertInviteTokenIsUsable(await resolveInviteToken(), now);
  } catch (error) {
    if (error instanceof InviteTokenValidationError) {
      throw new GuestInviteTokenAuthenticationError();
    }

    throw error;
  }

  try {
    const guest = assertGuestEligible(
      await resolveAuthenticatedGuest(inviteToken, dependencies.guestRepository),
    );
    let authenticatedAt = now;

    if (shouldConsumeInviteToken) {
      await dependencies.inviteTokenConsumptionTransactionRunner.run(async (context) => {
        const storedInviteToken = context.findInviteTokenById(inviteToken.id);
        inviteToken = assertInviteTokenIsUsable(
          await storedInviteToken,
          dependencies.now?.() ?? new Date(),
        );
        authenticatedAt = dependencies.now?.() ?? new Date();
        inviteToken = assertInviteTokenIsUsable(inviteToken, authenticatedAt);

        await context.markInviteTokenAsUsed({
          inviteTokenId: inviteToken.id,
          usedAt: authenticatedAt,
        });
      });
    }

    return {
      guestId: guest.id,
      guestGroupId: guest.guestGroupId,
      inviteTokenId: inviteToken.id,
      authenticatedAt,
    };
  } catch (error) {
    if (error instanceof GuestInviteTokenAuthenticationError || error instanceof InviteTokenValidationError) {
      throw new GuestInviteTokenAuthenticationError();
    }

    throw error;
  }
}
