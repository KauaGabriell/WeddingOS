import { randomUUID } from "node:crypto";
import type { PhotoPost } from "../domain/entities/photo-post.js";
import type { PhotoPostRepository } from "../domain/repositories/photo-post-repository.js";
import type { PhotoStorageProvider } from "../infrastructure/photo-storage-provider.js";
import type { AuditLogWriter } from "../../admin-backoffice/application/audit-log-writer.js";
import { PhotoWallApplicationError } from "./photo-wall-errors.js";

export interface CreatePhotoPostInput {
  readonly guestId: string;
  readonly authorName: string;
  readonly message: string;
  readonly fileName: string;
  readonly fileBody: Buffer | Uint8Array;
  readonly mediaMimeType: string;
  readonly mediaSizeBytes: number;
  readonly mediaWidth?: number;
  readonly mediaHeight?: number;
  readonly requestId?: string;
}

export interface CreatePhotoPostResult {
  readonly photoPost: PhotoPost;
  readonly mediaUrl: string;
}

export interface CreatePhotoPostUseCase {
  execute(input: CreatePhotoPostInput): Promise<CreatePhotoPostResult>;
}

interface CreatePhotoPostGuest {
  readonly id: string;
  readonly status: "active" | "inactive";
}

export interface CreatePhotoPostDependencies {
  readonly guestRepository: {
    findById(id: string): Promise<CreatePhotoPostGuest | null>;
  };
  readonly photoStorageProvider: Pick<PhotoStorageProvider, "uploadPhoto">;
  readonly photoPostRepository: Pick<PhotoPostRepository, "save">;
  readonly auditLogWriter: AuditLogWriter;
}

const PHOTO_WALL_MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png"] as const;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;

function normalizeRequiredText(value: string): string {
  return value.trim();
}

function getFileExtension(fileName: string): string {
  const normalizedFileName = fileName.trim().toLowerCase();
  const lastDotIndex = normalizedFileName.lastIndexOf(".");

  if (lastDotIndex < 0) {
    return "";
  }

  return normalizedFileName.slice(lastDotIndex);
}

function assertSupportedUpload(input: CreatePhotoPostInput): void {
  if (!ALLOWED_MEDIA_TYPES.includes(input.mediaMimeType as (typeof ALLOWED_MEDIA_TYPES)[number])) {
    throw new PhotoWallApplicationError("unsupported_media_type");
  }

  const extension = getFileExtension(input.fileName);

  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new PhotoWallApplicationError("unsupported_file_extension");
  }

  const isMimeExtensionMatch =
    (input.mediaMimeType === "image/jpeg" && (extension === ".jpg" || extension === ".jpeg")) ||
    (input.mediaMimeType === "image/png" && extension === ".png");

  if (!isMimeExtensionMatch) {
    throw new PhotoWallApplicationError("media_type_extension_mismatch");
  }

  if (input.mediaSizeBytes <= 0 || input.mediaSizeBytes > PHOTO_WALL_MAX_UPLOAD_SIZE_BYTES) {
    throw new PhotoWallApplicationError("file_too_large");
  }
}

export function createCreatePhotoPostUseCase(
  dependencies: CreatePhotoPostDependencies,
): CreatePhotoPostUseCase {
  return {
    async execute(input) {
      const guest = await dependencies.guestRepository.findById(input.guestId);

      if (guest === null) {
        throw new PhotoWallApplicationError("guest_not_found");
      }

      if (guest.status !== "active") {
        throw new PhotoWallApplicationError("guest_inactive");
      }

      assertSupportedUpload(input);

      const uploadedPhoto = await dependencies.photoStorageProvider.uploadPhoto({
        fileName: input.fileName,
        body: input.fileBody,
        contentType: input.mediaMimeType,
      });
      const now = new Date();
      const photoPost = await dependencies.photoPostRepository.save({
        id: randomUUID(),
        guestId: guest.id,
        authorName: normalizeRequiredText(input.authorName),
        message: normalizeRequiredText(input.message),
        mediaStorageKey: uploadedPhoto.mediaStorageKey,
        mediaUrl: null,
        mediaMimeType: input.mediaMimeType,
        mediaSizeBytes: input.mediaSizeBytes,
        mediaWidth: input.mediaWidth ?? null,
        mediaHeight: input.mediaHeight ?? null,
        moderationStatus: "pending",
        submittedAt: now,
        approvedAt: null,
        hiddenAt: null,
        moderatedByAdminUserId: null,
        createdAt: now,
        updatedAt: now,
      });

      await dependencies.auditLogWriter.write({
        entityType: "photo_post",
        entityId: photoPost.id,
        actionType: "PHOTO_POST_SUBMITTED",
        actorType: "guest",
        actorGuestId: guest.id,
        requestId: input.requestId,
        metadata: {
          mediaMimeType: photoPost.mediaMimeType,
          mediaSizeBytes: photoPost.mediaSizeBytes,
          moderationStatus: photoPost.moderationStatus,
        },
      });

      return {
        photoPost,
        mediaUrl: uploadedPhoto.mediaUrl,
      };
    },
  };
}
