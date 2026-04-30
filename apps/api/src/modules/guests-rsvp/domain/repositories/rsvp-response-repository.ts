import type { RsvpResponse, RsvpResponseStatus } from "../entities/rsvp-response.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface RsvpResponseRepositoryFilters extends PaginationQuery {
  readonly eventId?: string;
  readonly guestId?: string;
  readonly responseStatus?: RsvpResponseStatus;
}

export interface RsvpResponseRepository
  extends EntityRepository<RsvpResponse>,
    ListableRepository<RsvpResponse, RsvpResponseRepositoryFilters> {
  findByEventIdAndGuestId(eventId: string, guestId: string): Promise<RsvpResponse | null>;
}
