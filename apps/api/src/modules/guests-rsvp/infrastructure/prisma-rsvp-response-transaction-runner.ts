import type {
  RsvpResponseTransactionContext,
  RsvpResponseTransactionRunner,
} from "./rsvp-response-transactions.js";
import { PrismaRsvpResponseRepository } from "./prisma-rsvp-response-repository.js";

interface RsvpResponseTransactionCapableClient {
  readonly rsvpResponse: ConstructorParameters<typeof PrismaRsvpResponseRepository>[0];
  $transaction<T>(
    operation: (transactionClient: {
      rsvpResponse: ConstructorParameters<typeof PrismaRsvpResponseRepository>[0];
    }) => Promise<T>,
  ): Promise<T>;
}

export class PrismaRsvpResponseTransactionRunner
  implements RsvpResponseTransactionRunner
{
  constructor(private readonly prisma: RsvpResponseTransactionCapableClient) {}

  async runIdempotentSubmission<T>(
    operation: (context: RsvpResponseTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transactionClient) => {
      const repository = new PrismaRsvpResponseRepository(transactionClient.rsvpResponse);

      return operation({
        findResponseByEventAndGuest(eventId, guestId) {
          return repository.findByEventIdAndGuestId(eventId, guestId);
        },
        createResponse(input) {
          return repository.createResponse(input);
        },
        updateResponse(responseId, input) {
          return repository.updateResponse(responseId, input);
        },
      });
    });
  }
}
