import type { GiftReservation } from "../domain/entities/gift-reservation.js";
import type { ReserveAvailableGiftInput } from "../domain/reservation-transaction.js";

export interface GiftReservationTransactionContext {
  findReservationById(reservationId: string): Promise<GiftReservation | null>;
  findActiveReservationByGiftId(giftId: string): Promise<GiftReservation | null>;
  createActiveReservation(input: ReserveAvailableGiftInput): Promise<GiftReservation>;
  releaseActiveReservation(input: {
    readonly reservationId: string;
    readonly releasedByAdminUserId: string;
  }): Promise<GiftReservation>;
  updateGiftStatus(giftId: string, status: "available" | "reserved"): Promise<void>;
}

export interface GiftReservationTransactionRunner {
  run<T>(operation: (context: GiftReservationTransactionContext) => Promise<T>): Promise<T>;
}
