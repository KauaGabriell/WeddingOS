import type { GuestGroupRepository, GuestGroupRepositoryFilters } from "../domain/index.js";
import type { GuestGroup } from "../domain/entities/guest-group.js";
import type { GuestGroup as PrismaGuestGroup } from "../../../generated/prisma/client.js";

interface GuestGroupSearchCondition {
  displayName?: { contains: string; mode: "insensitive" };
  primaryContactName?: { contains: string; mode: "insensitive" };
  primaryContactEmail?: { contains: string; mode: "insensitive" };
  groupCode?: { contains: string; mode: "insensitive" };
}

interface GuestGroupWhereInput {
  groupCode?: string;
  OR?: GuestGroupSearchCondition[];
}

interface GuestGroupModelDelegate {
  findUnique(args: { where: { id?: string; groupCode?: string } }): Promise<PrismaGuestGroup | null>;
  findMany(args: {
    where: GuestGroupWhereInput;
    orderBy: { createdAt: "asc" | "desc" };
    skip: number;
    take: number;
  }): Promise<PrismaGuestGroup[]>;
  upsert(args: {
    where: { id: string };
    create: GuestGroupPersistenceData;
    update: GuestGroupPersistenceData;
  }): Promise<PrismaGuestGroup>;
}

interface GuestGroupPersistenceData {
  id: string;
  displayName: string;
  groupCode: string;
  allowedCompanions: number;
  primaryContactName: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapGuestGroupRecord(record: PrismaGuestGroup): GuestGroup {
  return {
    id: record.id,
    displayName: record.displayName,
    groupCode: record.groupCode,
    allowedCompanions: record.allowedCompanions,
    primaryContactName: record.primaryContactName,
    primaryContactPhone: record.primaryContactPhone,
    primaryContactEmail: record.primaryContactEmail,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapGuestGroupEntity(entity: GuestGroup): GuestGroupPersistenceData {
  return {
    id: entity.id,
    displayName: entity.displayName,
    groupCode: entity.groupCode,
    allowedCompanions: entity.allowedCompanions,
    primaryContactName: entity.primaryContactName,
    primaryContactPhone: entity.primaryContactPhone,
    primaryContactEmail: entity.primaryContactEmail,
    notes: entity.notes,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapGuestGroupFilters(
  filter: GuestGroupRepositoryFilters,
): { where: GuestGroupWhereInput; skip: number; take: number } {
  const search = filter.search?.trim();

  return {
    where: {
      groupCode: filter.groupCode,
      OR:
        search && search.length > 0
          ? [
              { displayName: { contains: search, mode: "insensitive" } },
              { primaryContactName: { contains: search, mode: "insensitive" } },
              { primaryContactEmail: { contains: search, mode: "insensitive" } },
              { groupCode: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaGuestGroupRepository implements GuestGroupRepository {
  constructor(private readonly guestGroups: GuestGroupModelDelegate) {}

  async findById(id: string): Promise<GuestGroup | null> {
    const record = await this.guestGroups.findUnique({
      where: { id },
    });

    return record ? mapGuestGroupRecord(record) : null;
  }

  async save(entity: GuestGroup): Promise<GuestGroup> {
    const record = await this.guestGroups.upsert({
      where: { id: entity.id },
      create: mapGuestGroupEntity(entity),
      update: mapGuestGroupEntity(entity),
    });

    return mapGuestGroupRecord(record);
  }

  async findMany(filter: GuestGroupRepositoryFilters): Promise<readonly GuestGroup[]> {
    const { where, skip, take } = mapGuestGroupFilters(filter);
    const records = await this.guestGroups.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    return records.map(mapGuestGroupRecord);
  }

  async findByGroupCode(groupCode: string): Promise<GuestGroup | null> {
    const record = await this.guestGroups.findUnique({
      where: { groupCode },
    });

    return record ? mapGuestGroupRecord(record) : null;
  }
}
