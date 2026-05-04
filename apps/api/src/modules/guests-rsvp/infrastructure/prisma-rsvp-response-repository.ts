import type { RsvpResponseRepository, RsvpResponseRepositoryFilters } from "../domain/index.js";
import type { RsvpResponse, RsvpResponseStatus } from "../domain/entities/rsvp-response.js";
import type { SubmitRsvpResponseInput } from "../domain/rsvp-idempotency.js";
import type { RsvpResponse as PrismaRsvpResponse } from "../../../generated/prisma/client.js";
import { RsvpResponseStatus as PrismaRsvpResponseStatus } from "../../../generated/prisma/enums.js";

interface RsvpResponseWhereInput {
  eventId?: string;
  guestId?: string;
  responseStatus?: keyof typeof PrismaRsvpResponseStatus;
}

interface RsvpResponseModelDelegate {
  findUnique(args: {
    where: { id?: string; eventId_guestId?: { eventId: string; guestId: string } };
  }): Promise<PrismaRsvpResponse | null>;
  findMany(args: {
    where: RsvpResponseWhereInput;
    orderBy: { respondedAt: "asc" | "desc" };
    skip: number;
    take: number;
  }): Promise<PrismaRsvpResponse[]>;
  upsert(args: {
    where: { id: string };
    create: RsvpResponsePersistenceData;
    update: RsvpResponsePersistenceData;
  }): Promise<PrismaRsvpResponse>;
  create(args: { data: SubmitRsvpResponsePersistenceData }): Promise<PrismaRsvpResponse>;
  update(args: {
    where: { id: string };
    data: SubmitRsvpResponsePersistenceData;
  }): Promise<PrismaRsvpResponse>;
}

interface RsvpResponsePersistenceData {
  id: string;
  eventId: string;
  guestId: string;
  responseStatus: keyof typeof PrismaRsvpResponseStatus;
  companionsConfirmed: number;
  message: string | null;
  respondedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface SubmitRsvpResponsePersistenceData {
  eventId: string;
  guestId: string;
  responseStatus: keyof typeof PrismaRsvpResponseStatus;
  companionsConfirmed: number;
  message: string | null;
  respondedAt: Date;
}

function mapStatusToDomain(status: keyof typeof PrismaRsvpResponseStatus): RsvpResponseStatus {
  return status.toLowerCase() as RsvpResponseStatus;
}

function mapStatusToPersistence(
  status: RsvpResponseStatus,
): keyof typeof PrismaRsvpResponseStatus {
  return status.toUpperCase() as keyof typeof PrismaRsvpResponseStatus;
}

function mapRecord(record: PrismaRsvpResponse): RsvpResponse {
  return {
    id: record.id,
    eventId: record.eventId,
    guestId: record.guestId,
    responseStatus: mapStatusToDomain(record.responseStatus),
    companionsConfirmed: record.companionsConfirmed,
    message: record.message,
    respondedAt: record.respondedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapEntity(entity: RsvpResponse): RsvpResponsePersistenceData {
  return {
    id: entity.id,
    eventId: entity.eventId,
    guestId: entity.guestId,
    responseStatus: mapStatusToPersistence(entity.responseStatus),
    companionsConfirmed: entity.companionsConfirmed,
    message: entity.message,
    respondedAt: entity.respondedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapInput(input: SubmitRsvpResponseInput): SubmitRsvpResponsePersistenceData {
  return {
    eventId: input.eventId,
    guestId: input.guestId,
    responseStatus: mapStatusToPersistence(input.responseStatus),
    companionsConfirmed: input.companionsConfirmed,
    message: input.message?.trim() ? input.message.trim() : null,
    respondedAt: new Date(),
  };
}

function mapFilters(
  filter: RsvpResponseRepositoryFilters,
): { where: RsvpResponseWhereInput; skip: number; take: number } {
  return {
    where: {
      eventId: filter.eventId,
      guestId: filter.guestId,
      responseStatus: filter.responseStatus
        ? mapStatusToPersistence(filter.responseStatus)
        : undefined,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaRsvpResponseRepository implements RsvpResponseRepository {
  constructor(private readonly responses: RsvpResponseModelDelegate) {}

  async findById(id: string): Promise<RsvpResponse | null> {
    const record = await this.responses.findUnique({
      where: { id },
    });

    return record ? mapRecord(record) : null;
  }

  async save(entity: RsvpResponse): Promise<RsvpResponse> {
    const record = await this.responses.upsert({
      where: { id: entity.id },
      create: mapEntity(entity),
      update: mapEntity(entity),
    });

    return mapRecord(record);
  }

  async findMany(filter: RsvpResponseRepositoryFilters): Promise<readonly RsvpResponse[]> {
    const { where, skip, take } = mapFilters(filter);
    const records = await this.responses.findMany({
      where,
      orderBy: { respondedAt: "desc" },
      skip,
      take,
    });

    return records.map(mapRecord);
  }

  async findByEventIdAndGuestId(eventId: string, guestId: string): Promise<RsvpResponse | null> {
    const record = await this.responses.findUnique({
      where: {
        eventId_guestId: {
          eventId,
          guestId,
        },
      },
    });

    return record ? mapRecord(record) : null;
  }

  async createResponse(input: SubmitRsvpResponseInput): Promise<RsvpResponse> {
    const record = await this.responses.create({
      data: mapInput(input),
    });

    return mapRecord(record);
  }

  async updateResponse(responseId: string, input: SubmitRsvpResponseInput): Promise<RsvpResponse> {
    const record = await this.responses.update({
      where: { id: responseId },
      data: mapInput(input),
    });

    return mapRecord(record);
  }
}
