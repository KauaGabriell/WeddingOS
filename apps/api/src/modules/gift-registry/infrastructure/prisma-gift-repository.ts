import type { GiftRepository, GiftRepositoryFilters } from "../domain/index.js";
import type { Gift, GiftStatus } from "../domain/entities/gift.js";
import type { Gift as PrismaGift } from "../../../generated/prisma/client.js";
import { GiftStatus as PrismaGiftStatus } from "../../../generated/prisma/enums.js";

interface GiftWhereInput {
  category?: string;
  status?: keyof typeof PrismaGiftStatus;
  isActive?: boolean;
  estimatedValue?: {
    gte?: number;
    lte?: number;
  };
  OR?: Array<{
    name?: { contains: string; mode: "insensitive" };
    category?: { contains: string; mode: "insensitive" };
    description?: { contains: string; mode: "insensitive" };
  }>;
}

interface GiftModelDelegate {
  findUnique(args: { where: { id: string } }): Promise<PrismaGift | null>;
  findMany(args: {
    where: GiftWhereInput;
    orderBy: Array<{ displayOrder: "asc" | "desc" } | { createdAt: "asc" | "desc" }>;
    skip: number;
    take: number;
  }): Promise<PrismaGift[]>;
  upsert(args: {
    where: { id: string };
    create: GiftPersistenceData;
    update: GiftPersistenceData;
  }): Promise<PrismaGift>;
}

interface GiftPersistenceData {
  id: string;
  name: string;
  category: string;
  description: string | null;
  estimatedValue: number | null;
  imageUrl: string | null;
  displayOrder: number;
  status: keyof typeof PrismaGiftStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function mapStatusToDomain(status: keyof typeof PrismaGiftStatus): GiftStatus {
  return status.toLowerCase() as GiftStatus;
}

function mapStatusToPersistence(status: GiftStatus): keyof typeof PrismaGiftStatus {
  return status.toUpperCase() as keyof typeof PrismaGiftStatus;
}

function mapEstimatedValue(value: PrismaGift["estimatedValue"]): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value);
}

function mapRecord(record: PrismaGift): Gift {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    description: record.description,
    estimatedValue: mapEstimatedValue(record.estimatedValue),
    imageUrl: record.imageUrl,
    displayOrder: record.displayOrder,
    status: mapStatusToDomain(record.status),
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapEntity(entity: Gift): GiftPersistenceData {
  return {
    id: entity.id,
    name: entity.name,
    category: entity.category,
    description: entity.description,
    estimatedValue: entity.estimatedValue,
    imageUrl: entity.imageUrl,
    displayOrder: entity.displayOrder,
    status: mapStatusToPersistence(entity.status),
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapFilters(filter: GiftRepositoryFilters): {
  where: GiftWhereInput;
  skip: number;
  take: number;
} {
  const search = filter.search?.trim();

  return {
    where: {
      category: filter.category,
      status: filter.status ? mapStatusToPersistence(filter.status) : undefined,
      isActive: filter.isActive,
      estimatedValue:
        filter.minEstimatedValue !== undefined || filter.maxEstimatedValue !== undefined
          ? {
              gte: filter.minEstimatedValue,
              lte: filter.maxEstimatedValue,
            }
          : undefined,
      OR:
        search && search.length > 0
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaGiftRepository implements GiftRepository {
  constructor(private readonly gifts: GiftModelDelegate) {}

  async findById(id: string): Promise<Gift | null> {
    const record = await this.gifts.findUnique({
      where: { id },
    });

    return record ? mapRecord(record) : null;
  }

  async save(entity: Gift): Promise<Gift> {
    const record = await this.gifts.upsert({
      where: { id: entity.id },
      create: mapEntity(entity),
      update: mapEntity(entity),
    });

    return mapRecord(record);
  }

  async findMany(filter: GiftRepositoryFilters): Promise<readonly Gift[]> {
    const { where, skip, take } = mapFilters(filter);
    const records = await this.gifts.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take,
    });

    return records.map(mapRecord);
  }
}
