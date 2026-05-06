import type { PhotoPostRepository, PhotoPostRepositoryFilters } from "../domain/index.js";
import type { PhotoPost, PhotoPostModerationStatus } from "../domain/entities/photo-post.js";
import type { PhotoPost as PrismaPhotoPost } from "../../../generated/prisma/client.js";
import { PhotoPostModerationStatus as PrismaPhotoPostModerationStatus } from "../../../generated/prisma/enums.js";

interface PhotoPostWhereInput {
  guestId?: string;
  moderationStatus?: keyof typeof PrismaPhotoPostModerationStatus;
}

interface PhotoPostModelDelegate {
  findUnique(args: { where: { id: string } }): Promise<PrismaPhotoPost | null>;
  findMany(args: {
    where: PhotoPostWhereInput;
    orderBy: Array<{ submittedAt: "asc" | "desc" } | { createdAt: "asc" | "desc" }>;
    skip: number;
    take: number;
  }): Promise<PrismaPhotoPost[]>;
  upsert(args: {
    where: { id: string };
    create: PhotoPostPersistenceData;
    update: PhotoPostPersistenceData;
  }): Promise<PrismaPhotoPost>;
}

interface PhotoPostPersistenceData {
  id: string;
  guestId: string;
  authorName: string;
  message: string;
  mediaStorageKey: string;
  mediaUrl: string | null;
  mediaMimeType: string;
  mediaSizeBytes: number;
  mediaWidth: number | null;
  mediaHeight: number | null;
  moderationStatus: keyof typeof PrismaPhotoPostModerationStatus;
  submittedAt: Date;
  approvedAt: Date | null;
  hiddenAt: Date | null;
  moderatedByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapModerationStatusToDomain(
  status: keyof typeof PrismaPhotoPostModerationStatus,
): PhotoPostModerationStatus {
  return status.toLowerCase() as PhotoPostModerationStatus;
}

function mapModerationStatusToPersistence(
  status: PhotoPostModerationStatus,
): keyof typeof PrismaPhotoPostModerationStatus {
  return status.toUpperCase() as keyof typeof PrismaPhotoPostModerationStatus;
}

function mapRecord(record: PrismaPhotoPost): PhotoPost {
  return {
    id: record.id,
    guestId: record.guestId,
    authorName: record.authorName,
    message: record.message,
    mediaStorageKey: record.mediaStorageKey,
    mediaUrl: record.mediaUrl,
    mediaMimeType: record.mediaMimeType,
    mediaSizeBytes: record.mediaSizeBytes,
    mediaWidth: record.mediaWidth,
    mediaHeight: record.mediaHeight,
    moderationStatus: mapModerationStatusToDomain(record.moderationStatus),
    submittedAt: record.submittedAt,
    approvedAt: record.approvedAt,
    hiddenAt: record.hiddenAt,
    moderatedByAdminUserId: record.moderatedByAdminUserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapEntity(entity: PhotoPost): PhotoPostPersistenceData {
  return {
    id: entity.id,
    guestId: entity.guestId,
    authorName: entity.authorName,
    message: entity.message,
    mediaStorageKey: entity.mediaStorageKey,
    mediaUrl: entity.mediaUrl,
    mediaMimeType: entity.mediaMimeType,
    mediaSizeBytes: entity.mediaSizeBytes,
    mediaWidth: entity.mediaWidth,
    mediaHeight: entity.mediaHeight,
    moderationStatus: mapModerationStatusToPersistence(entity.moderationStatus),
    submittedAt: entity.submittedAt,
    approvedAt: entity.approvedAt,
    hiddenAt: entity.hiddenAt,
    moderatedByAdminUserId: entity.moderatedByAdminUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapFilters(filter: PhotoPostRepositoryFilters): {
  where: PhotoPostWhereInput;
  skip: number;
  take: number;
} {
  return {
    where: {
      guestId: filter.guestId,
      moderationStatus: filter.moderationStatus
        ? mapModerationStatusToPersistence(filter.moderationStatus)
        : undefined,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaPhotoPostRepository implements PhotoPostRepository {
  constructor(private readonly photoPost: PhotoPostModelDelegate) {}

  async findById(id: string): Promise<PhotoPost | null> {
    const record = await this.photoPost.findUnique({
      where: { id },
    });

    return record ? mapRecord(record) : null;
  }

  async save(entity: PhotoPost): Promise<PhotoPost> {
    const record = await this.photoPost.upsert({
      where: { id: entity.id },
      create: mapEntity(entity),
      update: mapEntity(entity),
    });

    return mapRecord(record);
  }

  async findMany(filter: PhotoPostRepositoryFilters): Promise<readonly PhotoPost[]> {
    const { where, skip, take } = mapFilters(filter);
    const records = await this.photoPost.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    });

    return records.map(mapRecord);
  }
}
