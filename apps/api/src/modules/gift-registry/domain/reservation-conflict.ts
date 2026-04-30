export class GiftReservationConflictError extends Error {
  readonly giftId: string;
  readonly statusCode = 409;

  constructor(giftId: string, message = "Gift already has an active reservation") {
    super(message);
    this.name = "GiftReservationConflictError";
    this.giftId = giftId;
  }
}
