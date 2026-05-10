import type { Event, EventType } from "../entities/event.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface EventRepositoryFilters extends PaginationQuery {
  readonly isActive?: boolean;
  readonly eventType?: EventType;
  readonly slug?: string;
}

export interface EventRepository
  extends EntityRepository<Event>,
    ListableRepository<Event, EventRepositoryFilters> {
  findBySlug(slug: string): Promise<Event | null>;
}
