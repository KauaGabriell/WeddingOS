import type {
  EventGuestEligibilityRepository,
  EventGuestEligibilityRepositoryFilters,
} from "../domain/index.js";
import type { EventGuestEligibility } from "../domain/entities/event-guest-eligibility.js";
import type { EventGuestEligibility as PrismaEventGuestEligibility } from "../../../generated/prisma/client.js";

interface EventGuestEligibilityWhereInput {
  eventId?: string;
  guestId?:
    | string
    | {
        in: readonly string[];
      };
  canRsvp?: boolean;
}

interface EventGuestEligibilityModelDelegate {
  findUnique(args: {
    where: { id?: string; eventId_guestId?: { eventId: string; guestId: string } };
  }): Promise<PrismaEventGuestEligibility | null>;
  findMany(args: {
    where: EventGuestEligibilityWhereInput;
    orderBy: { createdAt: "asc" | "desc" };
    skip?: number;
    take?: number;
  }): Promise<PrismaEventGuestEligibility[]>;
  upsert(args: {
    where: { id: string };
    create: EventGuestEligibilityPersistenceData;
    update: EventGuestEligibilityPersistenceData;
  }): Promise<PrismaEventGuestEligibility>;
}

interface EventGuestEligibilityPersistenceData {
  id: string;
  eventId: string;
  guestId: string;
  canRsvp: boolean;
  createdAt: Date;
}

function mapRecord(record: PrismaEventGuestEligibility): EventGuestEligibility {
  return {
    id: record.id,
    eventId: record.eventId,
    guestId: record.guestId,
    canRsvp: record.canRsvp,
    createdAt: record.createdAt,
  };
}

function mapEntity(entity: EventGuestEligibility): EventGuestEligibilityPersistenceData {
  return {
    id: entity.id,
    eventId: entity.eventId,
    guestId: entity.guestId,
    canRsvp: entity.canRsvp,
    createdAt: entity.createdAt,
  };
}

function mapFilters(
  filter: EventGuestEligibilityRepositoryFilters,
): { where: EventGuestEligibilityWhereInput; skip: number; take: number } {
  const guestIds = filter.guestIds?.filter((guestId) => guestId.trim().length > 0);
  const isGuestIdsScoped = guestIds !== undefined;

  return {
    where: {
      eventId: filter.eventId,
      guestId:
        guestIds !== undefined
          ? {
              in: guestIds,
            }
          : filter.guestId,
      canRsvp: filter.canRsvp,
    },
    skip: isGuestIdsScoped ? 0 : Math.max(0, (filter.page - 1) * filter.pageSize),
    take: isGuestIdsScoped ? 0 : filter.pageSize,
  };
}

export class PrismaEventGuestEligibilityRepository implements EventGuestEligibilityRepository {
  constructor(private readonly eligibilities: EventGuestEligibilityModelDelegate) {}

  async findById(id: string): Promise<EventGuestEligibility | null> {
    const record = await this.eligibilities.findUnique({
      where: { id },
    });

    return record ? mapRecord(record) : null;
  }

  async save(entity: EventGuestEligibility): Promise<EventGuestEligibility> {
    const record = await this.eligibilities.upsert({
      where: { id: entity.id },
      create: mapEntity(entity),
      update: mapEntity(entity),
    });

    return mapRecord(record);
  }

  async findMany(
    filter: EventGuestEligibilityRepositoryFilters,
  ): Promise<readonly EventGuestEligibility[]> {
    const { where, skip, take } = mapFilters(filter);
    const records = await this.eligibilities.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(take > 0 ? { skip, take } : {}),
    });

    return records.map(mapRecord);
  }

  async findByEventIdAndGuestId(
    eventId: string,
    guestId: string,
  ): Promise<EventGuestEligibility | null> {
    const record = await this.eligibilities.findUnique({
      where: {
        eventId_guestId: {
          eventId,
          guestId,
        },
      },
    });

    return record ? mapRecord(record) : null;
  }
}
