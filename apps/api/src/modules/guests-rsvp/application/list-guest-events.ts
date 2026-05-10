import type {
  Event,
  EventGuestEligibilityRepository,
  EventRepository,
  EventType,
  Guest,
  GuestRepository,
} from "../domain/index.js";
import { GuestsRsvpApplicationError } from "./guests-rsvp-errors.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const ELIGIBILITY_QUERY_PAGE_SIZE = 100;

export interface ListGuestEventsInput {
  readonly guestId: string;
  readonly eventType?: EventType;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface ListGuestEventsResult {
  readonly items: readonly Event[];
  readonly page: number;
  readonly pageSize: number;
}

export interface ListGuestEventsDependencies {
  readonly guestRepository: Pick<GuestRepository, "findById">;
  readonly eventRepository: Pick<EventRepository, "findById">;
  readonly eventGuestEligibilityRepository: Pick<EventGuestEligibilityRepository, "findMany">;
}

export interface ListGuestEventsUseCase {
  execute(input: ListGuestEventsInput): Promise<ListGuestEventsResult>;
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

function normalizePagination(input: ListGuestEventsInput): {
  page: number;
  pageSize: number;
} {
  return {
    page: input.page ?? DEFAULT_PAGE,
    pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

export function createListGuestEventsUseCase(
  dependencies: ListGuestEventsDependencies,
): ListGuestEventsUseCase {
  return {
    async execute(input) {
      assertActiveGuest(await dependencies.guestRepository.findById(input.guestId));

      const { page, pageSize } = normalizePagination(input);
      const eligibility = await dependencies.eventGuestEligibilityRepository.findMany({
        guestId: input.guestId,
        canRsvp: true,
        page: 1,
        pageSize: ELIGIBILITY_QUERY_PAGE_SIZE,
      });
      const uniqueEventIds = [...new Set(eligibility.map((entry) => entry.eventId))];

      const events = (
        await Promise.all(
          uniqueEventIds.map((eventId) => dependencies.eventRepository.findById(eventId)),
        )
      )
        .filter((event): event is Event => event !== null)
        .filter((event) => event.isActive)
        .filter((event) => (input.eventType ? event.eventType === input.eventType : true))
        .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

      const start = Math.max(0, (page - 1) * pageSize);

      return {
        items: events.slice(start, start + pageSize),
        page,
        pageSize,
      };
    },
  };
}
