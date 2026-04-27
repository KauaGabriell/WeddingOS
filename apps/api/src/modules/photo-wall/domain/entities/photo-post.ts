export const PHOTO_POST_MODERATION_STATUSES = ["pending", "approved", "hidden", "removed"] as const;
export type PhotoPostModerationStatus = (typeof PHOTO_POST_MODERATION_STATUSES)[number];

export interface PhotoPost {
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
  moderationStatus: PhotoPostModerationStatus;
  submittedAt: Date;
  approvedAt: Date | null;
  hiddenAt: Date | null;
  moderatedByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
