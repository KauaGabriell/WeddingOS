import type { GuestGroup } from "../entities/guest-group.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface GuestGroupRepositoryFilters extends PaginationQuery {
  readonly search?: string;
  readonly groupCode?: string;
}

export interface GuestGroupRepository
  extends EntityRepository<GuestGroup>,
    ListableRepository<GuestGroup, GuestGroupRepositoryFilters> {
  findByGroupCode(groupCode: string): Promise<GuestGroup | null>;
}
