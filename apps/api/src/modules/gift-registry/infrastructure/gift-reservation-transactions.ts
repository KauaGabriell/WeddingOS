import type { GiftReservation } from "../domain/entities/gift-reservation.js";
import type { ReserveAvailableGiftInput } from "../domain/reservation-transaction.js";

export interface GiftReservationTransactionContext {
  findActiveReservationByGiftId(giftId: string): Promise<GiftReservation | null>;
  createActiveReservation(input: ReserveAvailableGiftInput): Promise<GiftReservation>;
}

export interface GiftReservationTransactionRunner {
  run<T>(operation: (context: GiftReservationTransactionContext) => Promise<T>): Promise<T>;
}
