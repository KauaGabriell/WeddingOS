import type { RsvpResponse, RsvpResponseStatus } from "../entities/rsvp-response.js";
import type { SubmitRsvpResponseInput } from "../rsvp-idempotency.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface RsvpResponseRepositoryFilters extends PaginationQuery {
  readonly eventId?: string;
  readonly guestId?: string;
  readonly guestIds?: readonly string[];
  readonly guestGroupId?: string;
  readonly responseStatus?: RsvpResponseStatus;
  readonly search?: string;
}

export interface RsvpResponseRepository
  extends EntityRepository<RsvpResponse>,
    ListableRepository<RsvpResponse, RsvpResponseRepositoryFilters> {
  findByEventIdAndGuestId(eventId: string, guestId: string): Promise<RsvpResponse | null>;
  createResponse(input: SubmitRsvpResponseInput): Promise<RsvpResponse>;
  updateResponse(responseId: string, input: SubmitRsvpResponseInput): Promise<RsvpResponse>;
}
