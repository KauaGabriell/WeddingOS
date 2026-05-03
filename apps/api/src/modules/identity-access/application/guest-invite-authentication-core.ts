import {
  InvalidInviteTokenConsumptionError,
  resolveInviteTokenLifecycleStatus,
  type Guest,
  type GuestRepository,
  type InviteToken,
} from "../domain/index.js";
import type { InviteTokenConsumptionTransactionRunner } from "../infrastructure/index.js";

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
): Promise<GuestAuthenticationResult> {
  const now = dependencies.now?.() ?? new Date();
  const inviteToken = await resolveInviteToken();

  if (inviteToken === null) {
    throw new GuestInviteTokenAuthenticationError();
  }

  if (resolveInviteTokenLifecycleStatus(inviteToken, now) !== "issued") {
    throw new GuestInviteTokenAuthenticationError();
  }

  const guest = assertGuestEligible(
    await resolveAuthenticatedGuest(inviteToken, dependencies.guestRepository),
  );

  let authenticatedAt = now;

  try {
    await dependencies.inviteTokenConsumptionTransactionRunner.run(async (context) => {
      const storedInviteToken = await context.findInviteTokenById(inviteToken.id);

      if (storedInviteToken === null) {
        throw new GuestInviteTokenAuthenticationError();
      }

      authenticatedAt = dependencies.now?.() ?? new Date();

      if (resolveInviteTokenLifecycleStatus(storedInviteToken, authenticatedAt) !== "issued") {
        throw new GuestInviteTokenAuthenticationError();
      }

      await context.markInviteTokenAsUsed({
        inviteTokenId: storedInviteToken.id,
        usedAt: authenticatedAt,
      });
    });
  } catch (error) {
    if (
      error instanceof GuestInviteTokenAuthenticationError ||
      error instanceof InvalidInviteTokenConsumptionError
    ) {
      throw new GuestInviteTokenAuthenticationError();
    }

    throw error;
  }

  return {
    guestId: guest.id,
    guestGroupId: guest.guestGroupId,
    inviteTokenId: inviteToken.id,
    authenticatedAt,
  };
}
