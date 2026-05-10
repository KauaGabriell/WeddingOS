import type { AuditLog, AuditLogActorType } from "../entities/audit-log.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface AuditLogRepositoryFilters extends PaginationQuery {
  readonly actorType?: AuditLogActorType;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly actionType?: string;
  readonly requestId?: string;
}

export interface AuditLogRepository
  extends EntityRepository<AuditLog>,
    ListableRepository<AuditLog, AuditLogRepositoryFilters> {}
