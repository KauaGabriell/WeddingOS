import type { EventGuestEligibility, Guest, GuestGroup } from "../../guests-rsvp/domain/index.js";
import { PrismaEventGuestEligibilityRepository } from "../../guests-rsvp/infrastructure/prisma-event-guest-eligibility-repository.js";
import { PrismaGuestGroupRepository } from "../../guests-rsvp/infrastructure/prisma-guest-group-repository.js";
import { PrismaGuestRepository as PrismaGuestsRsvpGuestRepository } from "../../guests-rsvp/infrastructure/prisma-guest-repository.js";
import type { InviteToken } from "../domain/index.js";
import { PrismaInviteTokenRepository } from "./prisma-invite-token-repository.js";

export interface OpenGuestAccessRegistrationTransactionContext {
  saveGuestGroup(entity: GuestGroup): Promise<GuestGroup>;
  saveGuest(entity: Guest): Promise<Guest>;
  saveInviteToken(entity: InviteToken): Promise<InviteToken>;
  saveEventGuestEligibility(entity: EventGuestEligibility): Promise<EventGuestEligibility>;
}

export interface OpenGuestAccessRegistrationTransactionRunner {
  run<T>(
    operation: (context: OpenGuestAccessRegistrationTransactionContext) => Promise<T>,
  ): Promise<T>;
}

interface OpenGuestAccessTransactionCapableClient {
  readonly guestGroup: any;
  readonly guest: any;
  readonly inviteToken: any;
  readonly eventGuestEligibility: any;
  $transaction<T>(
    operation: (transactionClient: {
      guestGroup: any;
      guest: any;
      inviteToken: any;
      eventGuestEligibility: any;
    }) => Promise<T>,
  ): Promise<T>;
}

export class PrismaOpenGuestAccessRegistrationTransactionRunner
  implements OpenGuestAccessRegistrationTransactionRunner
{
  constructor(private readonly prisma: OpenGuestAccessTransactionCapableClient) {}

  async run<T>(
    operation: (context: OpenGuestAccessRegistrationTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transactionClient) => {
      const guestGroupRepository = new PrismaGuestGroupRepository(transactionClient.guestGroup);
      const guestRepository = new PrismaGuestsRsvpGuestRepository(transactionClient.guest);
      const inviteTokenRepository = new PrismaInviteTokenRepository(transactionClient.inviteToken);
      const eventGuestEligibilityRepository = new PrismaEventGuestEligibilityRepository(
        transactionClient.eventGuestEligibility,
      );

      return operation({
        saveGuestGroup(entity) {
          return guestGroupRepository.save(entity);
        },
        saveGuest(entity) {
          return guestRepository.save(entity);
        },
        saveInviteToken(entity) {
          return inviteTokenRepository.save(entity);
        },
        saveEventGuestEligibility(entity) {
          return eventGuestEligibilityRepository.save(entity);
        },
      });
    });
  }
}
