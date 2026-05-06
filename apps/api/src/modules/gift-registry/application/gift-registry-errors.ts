export type GiftRegistryFailureReason =
  | "guest_not_found"
  | "guest_inactive"
  | "gift_not_found"
  | "gift_inactive"
  | "gift_unavailable";

export class GiftRegistryApplicationError extends Error {
  readonly reason: GiftRegistryFailureReason;
  readonly statusCode: 403 | 404;

  constructor(reason: GiftRegistryFailureReason) {
    super(`Gift registry operation failed: ${reason}`);
    this.name = "GiftRegistryApplicationError";
    this.reason = reason;

    switch (reason) {
      case "guest_inactive":
      case "gift_inactive":
      case "gift_unavailable":
        this.statusCode = 403;
        break;
      default:
        this.statusCode = 404;
        break;
    }
  }
}
