import type { GiftReservation } from "./entities/gift-reservation.js";

export interface ReserveAvailableGiftInput {
  readonly giftId: string;
  readonly guestId: string;
  readonly purchaseNotes?: string;
}

export interface GiftReservationTransaction {
  reserveAvailableGift(input: ReserveAvailableGiftInput): Promise<GiftReservation>;
}
