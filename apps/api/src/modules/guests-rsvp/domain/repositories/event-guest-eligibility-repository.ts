import type { EventGuestEligibility } from "../entities/event-guest-eligibility.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface EventGuestEligibilityRepositoryFilters extends PaginationQuery {
  readonly eventId?: string;
  readonly guestId?: string;
  readonly canRsvp?: boolean;
}

export interface EventGuestEligibilityRepository
  extends EntityRepository<EventGuestEligibility>,
    ListableRepository<EventGuestEligibility, EventGuestEligibilityRepositoryFilters> {
  findByEventIdAndGuestId(eventId: string, guestId: string): Promise<EventGuestEligibility | null>;
}
