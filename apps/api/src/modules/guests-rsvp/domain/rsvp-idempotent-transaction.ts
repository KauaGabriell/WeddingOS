import type {
  IdempotentRsvpSubmissionResult,
  SubmitRsvpResponseInput,
} from "./rsvp-idempotency.js";

export interface RsvpResponseIdempotentTransaction {
  submitIdempotentResponse(
    input: SubmitRsvpResponseInput,
  ): Promise<IdempotentRsvpSubmissionResult>;
}
