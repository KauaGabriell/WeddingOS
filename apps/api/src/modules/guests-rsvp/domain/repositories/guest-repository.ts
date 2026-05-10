import type { Guest, GuestStatus } from "../entities/guest.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface GuestRepositoryFilters extends PaginationQuery {
  readonly guestGroupId?: string;
  readonly status?: GuestStatus;
  readonly eventId?: string;
  readonly search?: string;
}

export interface GuestRepository
  extends EntityRepository<Guest>,
    ListableRepository<Guest, GuestRepositoryFilters> {
  findPrimaryByGroupId(guestGroupId: string): Promise<Guest | null>;
}
