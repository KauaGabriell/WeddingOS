import type { EventRepository, EventRepositoryFilters } from "../domain/index.js";
import type { Event, EventLocation, EventType } from "../domain/entities/event.js";
import type { Event as PrismaEvent } from "../../../generated/prisma/client.js";
import { EventType as PrismaEventType } from "../../../generated/prisma/enums.js";

interface DecimalLike {
  toNumber(): number;
}

interface EventWhereInput {
  isActive?: boolean;
  eventType?: keyof typeof PrismaEventType;
  slug?: string;
}

interface EventModelDelegate {
  findUnique(args: { where: { id?: string; slug?: string } }): Promise<PrismaEvent | null>;
  findMany(args: {
    where: EventWhereInput;
    orderBy: { startsAt: "asc" | "desc" };
    skip: number;
    take: number;
  }): Promise<PrismaEvent[]>;
  upsert(args: {
    where: { id: string };
    create: EventPersistenceData;
    update: EventPersistenceData;
  }): Promise<PrismaEvent>;
}

interface EventPersistenceData {
  id: string;
  slug: string;
  name: string;
  eventType: keyof typeof PrismaEventType;
  startsAt: Date;
  venueName: string;
  addressLine: string;
  addressNumber: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function mapEventTypeToDomain(eventType: keyof typeof PrismaEventType): EventType {
  return eventType.toLowerCase() as EventType;
}

function mapEventTypeToPersistence(eventType: EventType): keyof typeof PrismaEventType {
  return eventType.toUpperCase() as keyof typeof PrismaEventType;
}

function mapDecimal(value: DecimalLike | null): number | null {
  return value ? value.toNumber() : null;
}

function mapLocation(record: PrismaEvent): EventLocation {
  return {
    venueName: record.venueName,
    addressLine: record.addressLine,
    addressNumber: record.addressNumber,
    neighborhood: record.neighborhood,
    city: record.city,
    state: record.state,
    postalCode: record.postalCode,
    latitude: mapDecimal(record.latitude as DecimalLike | null),
    longitude: mapDecimal(record.longitude as DecimalLike | null),
    mapUrl: record.mapUrl,
  };
}

function mapEventRecord(record: PrismaEvent): Event {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    eventType: mapEventTypeToDomain(record.eventType),
    startsAt: record.startsAt,
    location: mapLocation(record),
    notes: record.notes,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapEventEntity(entity: Event): EventPersistenceData {
  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    eventType: mapEventTypeToPersistence(entity.eventType),
    startsAt: entity.startsAt,
    venueName: entity.location.venueName,
    addressLine: entity.location.addressLine,
    addressNumber: entity.location.addressNumber,
    neighborhood: entity.location.neighborhood,
    city: entity.location.city,
    state: entity.location.state,
    postalCode: entity.location.postalCode,
    latitude: entity.location.latitude,
    longitude: entity.location.longitude,
    mapUrl: entity.location.mapUrl,
    notes: entity.notes,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapEventFilters(
  filter: EventRepositoryFilters,
): { where: EventWhereInput; skip: number; take: number } {
  return {
    where: {
      isActive: filter.isActive,
      eventType: filter.eventType ? mapEventTypeToPersistence(filter.eventType) : undefined,
      slug: filter.slug,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly events: EventModelDelegate) {}

  async findById(id: string): Promise<Event | null> {
    const record = await this.events.findUnique({
      where: { id },
    });

    return record ? mapEventRecord(record) : null;
  }

  async save(entity: Event): Promise<Event> {
    const record = await this.events.upsert({
      where: { id: entity.id },
      create: mapEventEntity(entity),
      update: mapEventEntity(entity),
    });

    return mapEventRecord(record);
  }

  async findMany(filter: EventRepositoryFilters): Promise<readonly Event[]> {
    const { where, skip, take } = mapEventFilters(filter);
    const records = await this.events.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip,
      take,
    });

    return records.map(mapEventRecord);
  }

  async findBySlug(slug: string): Promise<Event | null> {
    const record = await this.events.findUnique({
      where: { slug },
    });

    return record ? mapEventRecord(record) : null;
  }
}
