import type { RsvpResponse } from "../domain/entities/rsvp-response.js";
import type {
  IdempotentRsvpSubmissionResult,
  SubmitRsvpResponseInput,
} from "../domain/rsvp-idempotency.js";

export interface RsvpResponseTransactionContext {
  findResponseByEventAndGuest(eventId: string, guestId: string): Promise<RsvpResponse | null>;
  createResponse(input: SubmitRsvpResponseInput): Promise<RsvpResponse>;
  updateResponse(
    responseId: string,
    input: SubmitRsvpResponseInput,
  ): Promise<RsvpResponse>;
}

export interface RsvpResponseTransactionRunner {
  runIdempotentSubmission(
    operation: (
      context: RsvpResponseTransactionContext,
    ) => Promise<IdempotentRsvpSubmissionResult>,
  ): Promise<IdempotentRsvpSubmissionResult>;
}
