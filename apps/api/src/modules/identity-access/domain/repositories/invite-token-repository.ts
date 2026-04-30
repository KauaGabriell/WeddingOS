import type { InviteToken, InviteTokenStatus } from "../entities/invite-token.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface InviteTokenRepositoryFilters extends PaginationQuery {
  readonly guestId?: string;
  readonly guestGroupId?: string;
  readonly status?: InviteTokenStatus;
}

export interface InviteTokenRepository
  extends EntityRepository<InviteToken>,
    ListableRepository<InviteToken, InviteTokenRepositoryFilters> {
  findByTokenHash(tokenHash: string): Promise<InviteToken | null>;
  findByShortCode(shortCode: string): Promise<InviteToken | null>;
}
