import type {
  EventGuestEligibilityRepository,
  GuestGroupRepository,
  GuestRepository,
  RsvpResponseRepository,
} from "../domain/index.js";
import { GuestsRsvpApplicationError } from "./guests-rsvp-errors.js";
import type {
  AdminGuestRsvpRow,
  ListAdminGuestsAndRsvpsInput,
  ListAdminGuestsAndRsvpsResult,
} from "./admin-guests-rsvp-contract.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
export interface ListAdminGuestsAndRsvpsDependencies {
  readonly guestRepository: Pick<GuestRepository, "findMany">;
  readonly guestGroupRepository: Pick<GuestGroupRepository, "findById">;
  readonly eventGuestEligibilityRepository: Pick<EventGuestEligibilityRepository, "findMany">;
  readonly rsvpResponseRepository: Pick<RsvpResponseRepository, "findMany">;
}

export interface ListAdminGuestsAndRsvpsUseCase {
  execute(input: ListAdminGuestsAndRsvpsInput): Promise<ListAdminGuestsAndRsvpsResult>;
}

function normalizePagination(input: ListAdminGuestsAndRsvpsInput): {
  page: number;
  pageSize: number;
} {
  return {
    page: input.page ?? DEFAULT_PAGE,
    pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

function buildRow(
  guestGroupRepositoryResult: Awaited<ReturnType<GuestGroupRepository["findById"]>>,
  rows: Omit<AdminGuestRsvpRow, "guestGroup">,
): AdminGuestRsvpRow {
  if (guestGroupRepositoryResult === null) {
    throw new GuestsRsvpApplicationError("guest_group_not_found");
  }

  return {
    ...rows,
    guestGroup: guestGroupRepositoryResult,
  };
}

export function createListAdminGuestsAndRsvpsUseCase(
  dependencies: ListAdminGuestsAndRsvpsDependencies,
): ListAdminGuestsAndRsvpsUseCase {
  return {
    async execute(input) {
      const { page, pageSize } = normalizePagination(input);
      const guests = await dependencies.guestRepository.findMany({
        eventId: input.eventId,
        guestGroupId: input.guestGroupId,
        status: input.guestStatus,
        search: input.search,
        page,
        pageSize,
      });
      const guestIds = guests.map((guest) => guest.id);

      if (guestIds.length === 0) {
        return {
          items: [],
          page,
          pageSize,
        };
      }

      const [eligibility, responses] = await Promise.all([
        dependencies.eventGuestEligibilityRepository.findMany({
          eventId: input.eventId,
          guestIds,
          page: DEFAULT_PAGE,
          pageSize,
        }),
        dependencies.rsvpResponseRepository.findMany({
          eventId: input.eventId,
          guestIds,
          responseStatus: input.responseStatus,
          page: DEFAULT_PAGE,
          pageSize,
        }),
      ]);

      const items = await Promise.all(
        guests.map(async (guest) =>
          buildRow(await dependencies.guestGroupRepository.findById(guest.guestGroupId), {
            guest,
            eligibility: eligibility.filter((entry) => entry.guestId === guest.id),
            responses: responses.filter((entry) => entry.guestId === guest.id),
          }),
        ),
      );

      return {
        items,
        page,
        pageSize,
      };
    },
  };
}
