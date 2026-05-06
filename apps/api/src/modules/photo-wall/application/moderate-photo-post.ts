import type { PhotoPost, PhotoPostModerationStatus } from "../domain/entities/photo-post.js";
import type { PhotoPostRepository } from "../domain/repositories/photo-post-repository.js";
import type { AuditLogWriter } from "../../admin-backoffice/application/audit-log-writer.js";
import { PhotoWallModerationError } from "./photo-wall-errors.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

type ModerationDecision = Exclude<PhotoPostModerationStatus, "pending">;

export interface ListModerationPhotoPostsInput {
  readonly moderationStatus?: PhotoPostModerationStatus;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface ListModerationPhotoPostsResult {
  readonly items: readonly PhotoPost[];
  readonly page: number;
  readonly pageSize: number;
}

export interface ModeratePhotoPostInput {
  readonly photoPostId: string;
  readonly moderationStatus: ModerationDecision;
  readonly moderatedByAdminUserId: string;
  readonly requestId?: string;
}

export interface ListModerationPhotoPostsUseCase {
  execute(input: ListModerationPhotoPostsInput): Promise<ListModerationPhotoPostsResult>;
}

export interface ModeratePhotoPostUseCase {
  execute(input: ModeratePhotoPostInput): Promise<PhotoPost>;
}

interface ModerationAdminUser {
  readonly id: string;
  readonly status: "active" | "inactive";
}

export interface PhotoWallModerationDependencies {
  readonly photoPostRepository: Pick<PhotoPostRepository, "findById" | "findMany" | "save">;
  readonly adminUserRepository: {
    findById(id: string): Promise<ModerationAdminUser | null>;
  };
  readonly auditLogWriter: AuditLogWriter;
}

function normalizePagination(input: ListModerationPhotoPostsInput): {
  page: number;
  pageSize: number;
} {
  return {
    page: input.page ?? DEFAULT_PAGE,
    pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

function applyModerationDecision(
  photoPost: PhotoPost,
  moderationStatus: ModerationDecision,
  moderatedByAdminUserId: string,
  now: Date,
): PhotoPost {
  switch (moderationStatus) {
    case "approved":
      return {
        ...photoPost,
        moderationStatus,
        approvedAt: now,
        hiddenAt: null,
        moderatedByAdminUserId,
        updatedAt: now,
      };
    case "hidden":
      return {
        ...photoPost,
        moderationStatus,
        hiddenAt: now,
        moderatedByAdminUserId,
        updatedAt: now,
      };
    case "removed":
      return {
        ...photoPost,
        moderationStatus,
        hiddenAt: now,
        moderatedByAdminUserId,
        updatedAt: now,
      };
  }
}

export function createListModerationPhotoPostsUseCase(
  dependencies: PhotoWallModerationDependencies,
): ListModerationPhotoPostsUseCase {
  return {
    async execute(input) {
      const { page, pageSize } = normalizePagination(input);
      const items = await dependencies.photoPostRepository.findMany({
        moderationStatus: input.moderationStatus,
        page,
        pageSize,
      });

      return {
        items,
        page,
        pageSize,
      };
    },
  };
}

export function createModeratePhotoPostUseCase(
  dependencies: PhotoWallModerationDependencies,
): ModeratePhotoPostUseCase {
  return {
    async execute(input) {
      const photoPost = await dependencies.photoPostRepository.findById(input.photoPostId);

      if (photoPost === null) {
        throw new PhotoWallModerationError("photo_post_not_found");
      }

      const adminUser = await dependencies.adminUserRepository.findById(
        input.moderatedByAdminUserId,
      );

      if (adminUser === null) {
        throw new PhotoWallModerationError("admin_user_not_found");
      }

      if (adminUser.status !== "active") {
        throw new PhotoWallModerationError("admin_user_inactive");
      }

      if (photoPost.moderationStatus === "removed") {
        throw new PhotoWallModerationError("photo_post_already_removed");
      }

      if (photoPost.moderationStatus === input.moderationStatus) {
        throw new PhotoWallModerationError("photo_post_already_in_target_status");
      }

      const moderatedPost = await dependencies.photoPostRepository.save(
        applyModerationDecision(
          photoPost,
          input.moderationStatus,
          adminUser.id,
          new Date(),
        ),
      );

      await dependencies.auditLogWriter.write({
        entityType: "photo_post",
        entityId: moderatedPost.id,
        actionType: "PHOTO_POST_MODERATED",
        actorType: "admin",
        actorAdminUserId: adminUser.id,
        requestId: input.requestId,
        metadata: {
          moderationStatus: moderatedPost.moderationStatus,
        },
      });

      return moderatedPost;
    },
  };
}
