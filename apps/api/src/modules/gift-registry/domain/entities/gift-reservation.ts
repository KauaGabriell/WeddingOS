export const GIFT_RESERVATION_STATUSES = ["active", "released", "cancelled"] as const;
export type GiftReservationStatus = (typeof GIFT_RESERVATION_STATUSES)[number];

export interface GiftReservation {
  id: string;
  giftId: string;
  guestId: string;
  reservationStatus: GiftReservationStatus;
  purchaseNotes: string | null;
  reservedAt: Date;
  releasedAt: Date | null;
  releasedByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
