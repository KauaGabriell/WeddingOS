import type { RsvpResponse, RsvpResponseStatus } from "./entities/rsvp-response.js";

export interface SubmitRsvpResponseInput {
  readonly eventId: string;
  readonly guestId: string;
  readonly responseStatus: RsvpResponseStatus;
  readonly companionsConfirmed: number;
  readonly message?: string;
}

export interface RsvpResponseIdempotencyKey {
  readonly eventId: string;
  readonly guestId: string;
}

export interface IdempotentRsvpSubmissionResult {
  readonly persistedResponse: RsvpResponse;
  readonly outcome: "created" | "updated" | "replayed";
}

export function buildRsvpResponseIdempotencyKey(
  input: Pick<SubmitRsvpResponseInput, "eventId" | "guestId">,
): RsvpResponseIdempotencyKey {
  return {
    eventId: input.eventId,
    guestId: input.guestId,
  };
}
