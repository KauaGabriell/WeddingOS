import { randomUUID } from "node:crypto";
import type { PhotoPost } from "../domain/entities/photo-post.js";
import type { PhotoPostRepository } from "../domain/repositories/photo-post-repository.js";
import type { PhotoStorageProvider } from "../infrastructure/photo-storage-provider.js";
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
}

function normalizeRequiredText(value: string): string {
  return value.trim();
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

      return {
        photoPost,
        mediaUrl: uploadedPhoto.mediaUrl,
      };
    },
  };
}
