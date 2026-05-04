import type {
  EventRepository,
  EventGuestEligibilityRepository,
  Guest,
  GuestGroupRepository,
  GuestRepository,
  IdempotentRsvpSubmissionResult,
  RsvpResponse,
  SubmitRsvpResponseInput,
} from "../domain/index.js";
import type { RsvpResponseTransactionRunner } from "../infrastructure/index.js";
import { GuestsRsvpApplicationError } from "./guests-rsvp-errors.js";

export type ConfirmAttendanceInput = SubmitRsvpResponseInput;
export type ConfirmAttendanceResult = IdempotentRsvpSubmissionResult;

export interface ConfirmAttendanceDependencies {
  readonly guestRepository: Pick<GuestRepository, "findById">;
  readonly guestGroupRepository: Pick<GuestGroupRepository, "findById">;
  readonly eventRepository: Pick<EventRepository, "findById">;
  readonly eventGuestEligibilityRepository: Pick<
    EventGuestEligibilityRepository,
    "findByEventIdAndGuestId"
  >;
  readonly rsvpResponseTransactionRunner: RsvpResponseTransactionRunner;
}

export interface ConfirmAttendanceUseCase {
  execute(input: ConfirmAttendanceInput): Promise<ConfirmAttendanceResult>;
}

function assertActiveGuest(guest: Guest | null): Guest {
  if (guest === null) {
    throw new GuestsRsvpApplicationError("guest_not_found");
  }

  if (guest.status !== "active") {
    throw new GuestsRsvpApplicationError("guest_inactive");
  }

  return guest;
}

function normalizeMessage(message?: string): string | null {
  const normalized = message?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeInput(input: SubmitRsvpResponseInput): SubmitRsvpResponseInput {
  const message = normalizeMessage(input.message);

  return {
    ...input,
    ...(message === null ? {} : { message }),
  };
}

function isReplay(
  existingResponse: RsvpResponse,
  normalizedInput: SubmitRsvpResponseInput,
): boolean {
  return (
    existingResponse.responseStatus === normalizedInput.responseStatus &&
    existingResponse.companionsConfirmed === normalizedInput.companionsConfirmed &&
    existingResponse.message === normalizeMessage(normalizedInput.message)
  );
}

function assertCompanionsWithinLimit(
  companionsConfirmed: number,
  allowedCompanions: number,
): void {
  if (companionsConfirmed > allowedCompanions) {
    throw new GuestsRsvpApplicationError("companions_limit_exceeded");
  }
}

export function createConfirmAttendanceUseCase(
  dependencies: ConfirmAttendanceDependencies,
): ConfirmAttendanceUseCase {
  return {
    async execute(input) {
      const guest = assertActiveGuest(await dependencies.guestRepository.findById(input.guestId));
      const guestGroup = await dependencies.guestGroupRepository.findById(guest.guestGroupId);

      if (guestGroup === null) {
        throw new GuestsRsvpApplicationError("guest_group_not_found");
      }

      assertCompanionsWithinLimit(input.companionsConfirmed, guestGroup.allowedCompanions);
      const event = await dependencies.eventRepository.findById(input.eventId);

      if (event === null) {
        throw new GuestsRsvpApplicationError("event_not_found");
      }

      const eligibility = await dependencies.eventGuestEligibilityRepository.findByEventIdAndGuestId(
        event.id,
        guest.id,
      );

      if (eligibility === null) {
        throw new GuestsRsvpApplicationError("event_not_eligible");
      }

      if (!eligibility.canRsvp) {
        throw new GuestsRsvpApplicationError("event_rsvp_blocked");
      }

      const normalizedInput = normalizeInput(input);

      return dependencies.rsvpResponseTransactionRunner.runIdempotentSubmission(async (context) => {
        const existingResponse = await context.findResponseByEventAndGuest(event.id, guest.id);

        if (existingResponse === null) {
          return {
            persistedResponse: await context.createResponse(normalizedInput),
            outcome: "created",
          };
        }

        if (isReplay(existingResponse, normalizedInput)) {
          return {
            persistedResponse: existingResponse,
            outcome: "replayed",
          };
        }

        return {
          persistedResponse: await context.updateResponse(existingResponse.id, normalizedInput),
          outcome: "updated",
        };
      });
    },
  };
}
