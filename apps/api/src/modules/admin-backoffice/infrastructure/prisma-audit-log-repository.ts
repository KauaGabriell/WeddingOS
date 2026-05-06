import type { AuditLogRepository, AuditLogRepositoryFilters } from "../domain/index.js";
import type { AuditLog, AuditLogActorType } from "../domain/entities/audit-log.js";
import type { AuditLog as PrismaAuditLog, Prisma } from "../../../generated/prisma/client.js";
import { AuditLogActorType as PrismaAuditLogActorType } from "../../../generated/prisma/enums.js";

interface AuditLogWhereInput {
  actorType?: keyof typeof PrismaAuditLogActorType;
  entityType?: string;
  entityId?: string;
  actionType?: string;
  requestId?: string;
}

interface AuditLogModelDelegate {
  findUnique(args: { where: { id: string } }): Promise<PrismaAuditLog | null>;
  findMany(args: {
    where: AuditLogWhereInput;
    orderBy: Array<{ createdAt: "asc" | "desc" }>;
    skip: number;
    take: number;
  }): Promise<PrismaAuditLog[]>;
  upsert(args: {
    where: { id: string };
    create: AuditLogPersistenceData;
    update: AuditLogPersistenceData;
  }): Promise<PrismaAuditLog>;
}

interface AuditLogPersistenceData {
  id: string;
  entityType: string;
  entityId: string;
  actionType: string;
  actorAdminUserId: string | null;
  actorGuestId: string | null;
  actorType: keyof typeof PrismaAuditLogActorType;
  requestId: string | null;
  metadata: Prisma.InputJsonObject | null;
  createdAt: Date;
}

function mapActorTypeToDomain(status: keyof typeof PrismaAuditLogActorType): AuditLogActorType {
  return status.toLowerCase() as AuditLogActorType;
}

function mapActorTypeToPersistence(
  status: AuditLogActorType,
): keyof typeof PrismaAuditLogActorType {
  return status.toUpperCase() as keyof typeof PrismaAuditLogActorType;
}

function mapMetadataFromPersistence(
  metadata: PrismaAuditLog["metadata"],
): Record<string, unknown> | null {
  if (metadata === null || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }

  return metadata as Record<string, unknown>;
}

function mapMetadataToPersistence(
  metadata: Record<string, unknown> | null,
): Prisma.InputJsonObject | null {
  if (metadata === null) {
    return null;
  }

  return metadata as Prisma.InputJsonObject;
}

function mapRecord(record: PrismaAuditLog): AuditLog {
  return {
    id: record.id,
    entityType: record.entityType,
    entityId: record.entityId,
    actionType: record.actionType,
    actorAdminUserId: record.actorAdminUserId,
    actorGuestId: record.actorGuestId,
    actorType: mapActorTypeToDomain(record.actorType),
    requestId: record.requestId,
    metadata: mapMetadataFromPersistence(record.metadata),
    createdAt: record.createdAt,
  };
}

function mapEntity(entity: AuditLog): AuditLogPersistenceData {
  return {
    id: entity.id,
    entityType: entity.entityType,
    entityId: entity.entityId,
    actionType: entity.actionType,
    actorAdminUserId: entity.actorAdminUserId,
    actorGuestId: entity.actorGuestId,
    actorType: mapActorTypeToPersistence(entity.actorType),
    requestId: entity.requestId,
    metadata: mapMetadataToPersistence(entity.metadata),
    createdAt: entity.createdAt,
  };
}

function mapFilters(filter: AuditLogRepositoryFilters): {
  where: AuditLogWhereInput;
  skip: number;
  take: number;
} {
  return {
    where: {
      actorType: filter.actorType ? mapActorTypeToPersistence(filter.actorType) : undefined,
      entityType: filter.entityType,
      entityId: filter.entityId,
      actionType: filter.actionType,
      requestId: filter.requestId,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly auditLogs: AuditLogModelDelegate) {}

  async findById(id: string): Promise<AuditLog | null> {
    const record = await this.auditLogs.findUnique({
      where: { id },
    });

    return record ? mapRecord(record) : null;
  }

  async save(entity: AuditLog): Promise<AuditLog> {
    const record = await this.auditLogs.upsert({
      where: { id: entity.id },
      create: mapEntity(entity),
      update: mapEntity(entity),
    });

    return mapRecord(record);
  }

  async findMany(filter: AuditLogRepositoryFilters): Promise<readonly AuditLog[]> {
    const { where, skip, take } = mapFilters(filter);
    const records = await this.auditLogs.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take,
    });

    return records.map(mapRecord);
  }
}
