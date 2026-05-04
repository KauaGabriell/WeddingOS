import type { GuestRepository, GuestRepositoryFilters } from "../domain/index.js";
import type { Guest, GuestStatus } from "../domain/entities/guest.js";
import type { Guest as PrismaGuest } from "../../../generated/prisma/client.js";
import { GuestStatus as PrismaGuestStatus } from "../../../generated/prisma/enums.js";

interface GuestSearchCondition {
  fullName?: { contains: string; mode: "insensitive" };
  email?: { contains: string; mode: "insensitive" };
  phone?: { contains: string; mode: "insensitive" };
}

interface GuestWhereInput {
  guestGroupId?: string;
  status?: keyof typeof PrismaGuestStatus;
  OR?: GuestSearchCondition[];
}

interface GuestModelDelegate {
  findUnique(args: { where: { id: string } }): Promise<PrismaGuest | null>;
  findFirst(args: {
    where: { guestGroupId: string; isPrimary?: boolean };
    orderBy: { createdAt: "asc" | "desc" };
  }): Promise<PrismaGuest | null>;
  findMany(args: {
    where: GuestWhereInput;
    orderBy: { createdAt: "asc" | "desc" };
    skip: number;
    take: number;
  }): Promise<PrismaGuest[]>;
  upsert(args: {
    where: { id: string };
    create: GuestPersistenceData;
    update: GuestPersistenceData;
  }): Promise<PrismaGuest>;
}

interface GuestPersistenceData {
  id: string;
  guestGroupId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  status: keyof typeof PrismaGuestStatus;
  lastAccessAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapGuestStatusToDomain(status: keyof typeof PrismaGuestStatus): GuestStatus {
  return status.toLowerCase() as GuestStatus;
}

function mapGuestStatusToPersistence(status: GuestStatus): keyof typeof PrismaGuestStatus {
  return status.toUpperCase() as keyof typeof PrismaGuestStatus;
}

function mapGuestRecord(record: PrismaGuest): Guest {
  return {
    id: record.id,
    guestGroupId: record.guestGroupId,
    fullName: record.fullName,
    phone: record.phone,
    email: record.email,
    isPrimary: record.isPrimary,
    status: mapGuestStatusToDomain(record.status),
    lastAccessAt: record.lastAccessAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapGuestEntity(entity: Guest): GuestPersistenceData {
  return {
    id: entity.id,
    guestGroupId: entity.guestGroupId,
    fullName: entity.fullName,
    phone: entity.phone,
    email: entity.email,
    isPrimary: entity.isPrimary,
    status: mapGuestStatusToPersistence(entity.status),
    lastAccessAt: entity.lastAccessAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapGuestFilters(
  filter: GuestRepositoryFilters,
): { where: GuestWhereInput; skip: number; take: number } {
  const search = filter.search?.trim();

  return {
    where: {
      guestGroupId: filter.guestGroupId,
      status: filter.status ? mapGuestStatusToPersistence(filter.status) : undefined,
      OR:
        search && search.length > 0
          ? [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaGuestRepository implements GuestRepository {
  constructor(private readonly guests: GuestModelDelegate) {}

  async findById(id: string): Promise<Guest | null> {
    const record = await this.guests.findUnique({
      where: { id },
    });

    return record ? mapGuestRecord(record) : null;
  }

  async save(entity: Guest): Promise<Guest> {
    const record = await this.guests.upsert({
      where: { id: entity.id },
      create: mapGuestEntity(entity),
      update: mapGuestEntity(entity),
    });

    return mapGuestRecord(record);
  }

  async findMany(filter: GuestRepositoryFilters): Promise<readonly Guest[]> {
    const { where, skip, take } = mapGuestFilters(filter);
    const records = await this.guests.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    return records.map(mapGuestRecord);
  }

  async findPrimaryByGroupId(guestGroupId: string): Promise<Guest | null> {
    const record = await this.guests.findFirst({
      where: { guestGroupId, isPrimary: true },
      orderBy: { createdAt: "asc" },
    });

    return record ? mapGuestRecord(record) : null;
  }
}
