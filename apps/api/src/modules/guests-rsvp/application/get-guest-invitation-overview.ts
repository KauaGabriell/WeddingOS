import type {
  Event,
  EventGuestEligibility,
  EventGuestEligibilityRepository,
  EventRepository,
  Guest,
  GuestGroup,
  GuestGroupRepository,
  GuestRepository,
  RsvpResponse,
  RsvpResponseRepository,
} from "../domain/index.js";
import type { InviteTokenRepository } from "../../identity-access/index.js";
import { GuestsRsvpApplicationError } from "./guests-rsvp-errors.js";

const GROUP_QUERY_PAGE_SIZE = 100;
const EVENT_QUERY_PAGE_SIZE = 50;
const RESPONSE_QUERY_PAGE_SIZE = 50;

export interface GetGuestInvitationOverviewInput {
  readonly guestId: string;
}

export interface GetGuestInvitationOverviewResult {
  readonly guestGroup: GuestGroup;
  readonly guests: readonly Guest[];
  readonly events: readonly Event[];
  readonly eligibility: readonly EventGuestEligibility[];
  readonly responses: readonly RsvpResponse[];
  readonly accessCode: string | null;
}

export interface GetGuestInvitationOverviewDependencies {
  readonly guestRepository: Pick<GuestRepository, "findById" | "findMany">;
  readonly guestGroupRepository: Pick<GuestGroupRepository, "findById">;
  readonly eventRepository: Pick<EventRepository, "findById">;
  readonly eventGuestEligibilityRepository: Pick<EventGuestEligibilityRepository, "findMany">;
  readonly rsvpResponseRepository: Pick<RsvpResponseRepository, "findMany">;
  readonly inviteTokenRepository: Pick<InviteTokenRepository, "findMany">;
}

export interface GetGuestInvitationOverviewUseCase {
  execute(input: GetGuestInvitationOverviewInput): Promise<GetGuestInvitationOverviewResult>;
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

function sortGuests(guests: readonly Guest[]): readonly Guest[] {
  return [...guests].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return left.fullName.localeCompare(right.fullName);
  });
}

function sortEvents(events: readonly Event[]): readonly Event[] {
  return [...events].sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
}

export function createGetGuestInvitationOverviewUseCase(
  dependencies: GetGuestInvitationOverviewDependencies,
): GetGuestInvitationOverviewUseCase {
  return {
    async execute(input) {
      const guest = assertActiveGuest(await dependencies.guestRepository.findById(input.guestId));
      const guestGroup = await dependencies.guestGroupRepository.findById(guest.guestGroupId);

      if (guestGroup === null) {
        throw new GuestsRsvpApplicationError("guest_group_not_found");
      }

      const guests = sortGuests(
        await dependencies.guestRepository.findMany({
          page: 1,
          pageSize: GROUP_QUERY_PAGE_SIZE,
          guestGroupId: guestGroup.id,
        }),
      );

      const eligibility = (
        await Promise.all(
          guests.map((groupGuest) =>
            dependencies.eventGuestEligibilityRepository.findMany({
              page: 1,
              pageSize: EVENT_QUERY_PAGE_SIZE,
              guestId: groupGuest.id,
            }),
          ),
        )
      ).flat();

      const uniqueEventIds = [...new Set(eligibility.map((entry) => entry.eventId))];
      const events = sortEvents(
        (
          await Promise.all(uniqueEventIds.map((eventId) => dependencies.eventRepository.findById(eventId)))
        ).filter((event): event is Event => event !== null),
      );

      const responses = (
        await Promise.all(
          guests.map((groupGuest) =>
            dependencies.rsvpResponseRepository.findMany({
              page: 1,
              pageSize: RESPONSE_QUERY_PAGE_SIZE,
              guestId: groupGuest.id,
            }),
          ),
        )
      )
        .flat()
        .filter((response) => uniqueEventIds.includes(response.eventId));
      const accessCode =
        (
          await dependencies.inviteTokenRepository.findMany({
            page: 1,
            pageSize: 10,
            guestId: guest.id,
            status: "issued",
          })
        ).find((token) => token.shortCode !== null)?.shortCode ?? null;

      return {
        guestGroup,
        guests,
        events,
        eligibility,
        responses,
        accessCode,
      };
    },
  };
}
