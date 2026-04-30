import { z } from "zod";
import {
  defineHttpSchemaCatalog,
  isoDateTimeSchema,
  paginationQuerySchema,
  uuidSchema,
} from "../../shared/platform/http/http-contracts.js";
import { PHOTO_POST_MODERATION_STATUSES } from "../domain/entities/photo-post.js";

const photoPostResponseSchema = z.object({
  id: uuidSchema,
  guestId: uuidSchema,
  authorName: z.string().min(1),
  message: z.string().min(1),
  mediaStorageKey: z.string().min(1),
  mediaUrl: z.string().url().nullable(),
  mediaMimeType: z.string().min(1),
  mediaSizeBytes: z.number().int().nonnegative(),
  mediaWidth: z.number().int().positive().nullable(),
  mediaHeight: z.number().int().positive().nullable(),
  moderationStatus: z.enum(PHOTO_POST_MODERATION_STATUSES),
  submittedAt: isoDateTimeSchema,
  approvedAt: isoDateTimeSchema.nullable(),
  hiddenAt: isoDateTimeSchema.nullable(),
  moderatedByAdminUserId: uuidSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const photoGalleryItemResponseSchema = photoPostResponseSchema.pick({
  id: true,
  authorName: true,
  message: true,
  mediaUrl: true,
  mediaMimeType: true,
  mediaWidth: true,
  mediaHeight: true,
  submittedAt: true,
});

export const PHOTO_WALL_HTTP_SCHEMAS = defineHttpSchemaCatalog({
  params: {
    photoPostId: z.object({
      photoPostId: uuidSchema,
    }),
  },
  queries: {
    galleryList: paginationQuerySchema,
    moderationQueue: paginationQuerySchema.extend({
      moderationStatus: z.enum(PHOTO_POST_MODERATION_STATUSES).optional(),
    }),
  },
  bodies: {
    createPhotoPost: z.object({
      guestId: uuidSchema,
      authorName: z.string().trim().min(1).max(120),
      message: z.string().trim().min(1).max(1_000),
      mediaMimeType: z.string().trim().min(1),
      mediaSizeBytes: z.number().int().positive(),
      mediaWidth: z.number().int().positive().optional(),
      mediaHeight: z.number().int().positive().optional(),
    }),
    moderatePhotoPost: z.object({
      moderationStatus: z.enum(["approved", "hidden", "removed"]),
      moderatedByAdminUserId: uuidSchema,
    }),
  },
  responses: {
    photoPost: photoPostResponseSchema,
    photoGalleryItem: photoGalleryItemResponseSchema,
  },
});

export type PhotoWallPhotoPostResponseDto = z.infer<
  typeof PHOTO_WALL_HTTP_SCHEMAS.responses.photoPost
>;
export type PhotoWallCreatePhotoPostRequestDto = z.infer<
  typeof PHOTO_WALL_HTTP_SCHEMAS.bodies.createPhotoPost
>;
export type PhotoWallModeratePhotoPostRequestDto = z.infer<
  typeof PHOTO_WALL_HTTP_SCHEMAS.bodies.moderatePhotoPost
>;
