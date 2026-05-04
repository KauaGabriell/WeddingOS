export type GuestsRsvpFailureReason =
  | "guest_not_found"
  | "guest_inactive"
  | "guest_group_not_found"
  | "companions_limit_exceeded"
  | "event_not_found"
  | "event_not_eligible"
  | "event_rsvp_blocked";

export class GuestsRsvpApplicationError extends Error {
  readonly reason: GuestsRsvpFailureReason;
  readonly statusCode: 400 | 403 | 404;

  constructor(reason: GuestsRsvpFailureReason) {
    super(`Guests RSVP operation failed: ${reason}`);
    this.name = "GuestsRsvpApplicationError";
    this.reason = reason;

    switch (reason) {
      case "companions_limit_exceeded":
        this.statusCode = 400;
        break;
      case "guest_inactive":
      case "event_not_eligible":
      case "event_rsvp_blocked":
        this.statusCode = 403;
        break;
      default:
        this.statusCode = 404;
        break;
    }
  }
}
