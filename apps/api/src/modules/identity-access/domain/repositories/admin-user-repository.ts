import type { AdminUser, AdminUserRole, AdminUserStatus } from "../entities/admin-user.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface AdminUserRepositoryFilters extends PaginationQuery {
  readonly role?: AdminUserRole;
  readonly status?: AdminUserStatus;
  readonly search?: string;
}

export interface AdminUserRepository
  extends EntityRepository<AdminUser>,
    ListableRepository<AdminUser, AdminUserRepositoryFilters> {
  findByEmail(email: string): Promise<AdminUser | null>;
}
