import type {
  GiftReservationRepository,
  GiftReservationRepositoryFilters,
} from "../domain/index.js";
import type {
  GiftReservation,
  GiftReservationStatus,
} from "../domain/entities/gift-reservation.js";
import { GiftReservationConflictError } from "../domain/reservation-conflict.js";
import type { GiftReservation as PrismaGiftReservation } from "../../../generated/prisma/client.js";
import { GiftReservationStatus as PrismaGiftReservationStatus } from "../../../generated/prisma/enums.js";

interface GiftReservationWhereInput {
  giftId?: string;
  guestId?: string;
  reservationStatus?: keyof typeof PrismaGiftReservationStatus;
}

interface GiftReservationModelDelegate {
  findUnique(args: { where: { id: string } }): Promise<PrismaGiftReservation | null>;
  findFirst(args: {
    where: GiftReservationWhereInput;
    orderBy: { reservedAt: "asc" | "desc" };
  }): Promise<PrismaGiftReservation | null>;
  findMany(args: {
    where: GiftReservationWhereInput;
    orderBy: { reservedAt: "asc" | "desc" };
    skip: number;
    take: number;
  }): Promise<PrismaGiftReservation[]>;
  upsert(args: {
    where: { id: string };
    create: GiftReservationPersistenceData;
    update: GiftReservationPersistenceData;
  }): Promise<PrismaGiftReservation>;
  create(args: {
    data: CreateActiveGiftReservationPersistenceData;
  }): Promise<PrismaGiftReservation>;
}

interface GiftReservationPersistenceData {
  id: string;
  giftId: string;
  guestId: string;
  reservationStatus: keyof typeof PrismaGiftReservationStatus;
  purchaseNotes: string | null;
  reservedAt: Date;
  releasedAt: Date | null;
  releasedByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateActiveGiftReservationPersistenceData {
  giftId: string;
  guestId: string;
  reservationStatus: keyof typeof PrismaGiftReservationStatus;
  purchaseNotes: string | null;
}

interface PrismaKnownRequestErrorLike {
  readonly code?: string;
}

function mapStatusToDomain(
  status: keyof typeof PrismaGiftReservationStatus,
): GiftReservationStatus {
  return status.toLowerCase() as GiftReservationStatus;
}

function mapStatusToPersistence(
  status: GiftReservationStatus,
): keyof typeof PrismaGiftReservationStatus {
  return status.toUpperCase() as keyof typeof PrismaGiftReservationStatus;
}

function normalizePurchaseNotes(notes?: string | null): string | null {
  const normalized = notes?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function isUniqueConstraintViolation(error: unknown): error is PrismaKnownRequestErrorLike {
  return typeof error === "object" && error !== null && "code" in error;
}

function mapRecord(record: PrismaGiftReservation): GiftReservation {
  return {
    id: record.id,
    giftId: record.giftId,
    guestId: record.guestId,
    reservationStatus: mapStatusToDomain(record.reservationStatus),
    purchaseNotes: record.purchaseNotes,
    reservedAt: record.reservedAt,
    releasedAt: record.releasedAt,
    releasedByAdminUserId: record.releasedByAdminUserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapEntity(entity: GiftReservation): GiftReservationPersistenceData {
  return {
    id: entity.id,
    giftId: entity.giftId,
    guestId: entity.guestId,
    reservationStatus: mapStatusToPersistence(entity.reservationStatus),
    purchaseNotes: entity.purchaseNotes,
    reservedAt: entity.reservedAt,
    releasedAt: entity.releasedAt,
    releasedByAdminUserId: entity.releasedByAdminUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapFilters(filter: GiftReservationRepositoryFilters): {
  where: GiftReservationWhereInput;
  skip: number;
  take: number;
} {
  return {
    where: {
      giftId: filter.giftId,
      guestId: filter.guestId,
      reservationStatus: filter.reservationStatus
        ? mapStatusToPersistence(filter.reservationStatus)
        : undefined,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaGiftReservationRepository implements GiftReservationRepository {
  constructor(private readonly reservations: GiftReservationModelDelegate) {}

  async findById(id: string): Promise<GiftReservation | null> {
    const record = await this.reservations.findUnique({
      where: { id },
    });

    return record ? mapRecord(record) : null;
  }

  async save(entity: GiftReservation): Promise<GiftReservation> {
    const record = await this.reservations.upsert({
      where: { id: entity.id },
      create: mapEntity(entity),
      update: mapEntity(entity),
    });

    return mapRecord(record);
  }

  async findMany(
    filter: GiftReservationRepositoryFilters,
  ): Promise<readonly GiftReservation[]> {
    const { where, skip, take } = mapFilters(filter);
    const records = await this.reservations.findMany({
      where,
      orderBy: { reservedAt: "desc" },
      skip,
      take,
    });

    return records.map(mapRecord);
  }

  async findActiveByGiftId(giftId: string): Promise<GiftReservation | null> {
    const record = await this.reservations.findFirst({
      where: {
        giftId,
        reservationStatus: PrismaGiftReservationStatus.ACTIVE,
      },
      orderBy: { reservedAt: "desc" },
    });

    return record ? mapRecord(record) : null;
  }

  async createActiveReservation(input: {
    readonly giftId: string;
    readonly guestId: string;
    readonly purchaseNotes?: string;
  }): Promise<GiftReservation> {
    let record: PrismaGiftReservation;

    try {
      record = await this.reservations.create({
        data: {
          giftId: input.giftId,
          guestId: input.guestId,
          reservationStatus: PrismaGiftReservationStatus.ACTIVE,
          purchaseNotes: normalizePurchaseNotes(input.purchaseNotes),
        },
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error) && error.code === "P2002") {
        throw new GiftReservationConflictError(input.giftId);
      }

      throw error;
    }

    return mapRecord(record);
  }
}
