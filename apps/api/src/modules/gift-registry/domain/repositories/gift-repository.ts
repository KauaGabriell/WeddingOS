import type { Gift, GiftStatus } from "../entities/gift.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface GiftRepositoryFilters extends PaginationQuery {
  readonly category?: string;
  readonly status?: GiftStatus;
  readonly isActive?: boolean;
  readonly search?: string;
}

export interface GiftRepository
  extends EntityRepository<Gift>,
    ListableRepository<Gift, GiftRepositoryFilters> {}
