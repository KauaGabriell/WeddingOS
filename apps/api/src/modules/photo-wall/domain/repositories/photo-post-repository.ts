import type { PhotoPost, PhotoPostModerationStatus } from "../entities/photo-post.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface PhotoPostRepositoryFilters extends PaginationQuery {
  readonly guestId?: string;
  readonly moderationStatus?: PhotoPostModerationStatus;
}

export interface PhotoPostRepository
  extends EntityRepository<PhotoPost>,
    ListableRepository<PhotoPost, PhotoPostRepositoryFilters> {}
