import type {
  GiftReservationTransactionContext,
  GiftReservationTransactionRunner,
} from "./gift-reservation-transactions.js";
import { PrismaGiftReservationRepository } from "./prisma-gift-reservation-repository.js";

interface GiftReservationTransactionCapableClient {
  readonly giftReservation: ConstructorParameters<typeof PrismaGiftReservationRepository>[0];
  $transaction<T>(
    operation: (transactionClient: {
      giftReservation: ConstructorParameters<typeof PrismaGiftReservationRepository>[0];
    }) => Promise<T>,
  ): Promise<T>;
}

export class PrismaGiftReservationTransactionRunner
  implements GiftReservationTransactionRunner
{
  constructor(private readonly prisma: GiftReservationTransactionCapableClient) {}

  async run<T>(
    operation: (context: GiftReservationTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transactionClient) => {
      const repository = new PrismaGiftReservationRepository(transactionClient.giftReservation);

      return operation({
        findReservationById(reservationId) {
          return repository.findById(reservationId);
        },
        findActiveReservationByGiftId(giftId) {
          return repository.findActiveByGiftId(giftId);
        },
        createActiveReservation(input) {
          return repository.createActiveReservation(input);
        },
        releaseActiveReservation(input) {
          return repository.releaseActiveReservation(input);
        },
      });
    });
  }
}
