export type PhotoWallFailureReason =
  | "guest_not_found"
  | "guest_inactive"
  | "unsupported_media_type"
  | "unsupported_file_extension"
  | "media_type_extension_mismatch"
  | "file_too_large";

export class PhotoWallApplicationError extends Error {
  readonly reason: PhotoWallFailureReason;
  readonly statusCode: 400 | 403 | 404;

  constructor(reason: PhotoWallFailureReason) {
    super(`Photo wall operation failed: ${reason}`);
    this.name = "PhotoWallApplicationError";
    this.reason = reason;

    switch (reason) {
      case "unsupported_media_type":
      case "unsupported_file_extension":
      case "media_type_extension_mismatch":
      case "file_too_large":
        this.statusCode = 400;
        break;
      case "guest_inactive":
        this.statusCode = 403;
        break;
      default:
        this.statusCode = 404;
        break;
    }
  }
}

export type PhotoWallModerationFailureReason =
  | "photo_post_not_found"
  | "admin_user_not_found"
  | "admin_user_inactive"
  | "photo_post_already_removed"
  | "photo_post_already_in_target_status";

export class PhotoWallModerationError extends Error {
  readonly reason: PhotoWallModerationFailureReason;
  readonly statusCode: 403 | 404 | 409;

  constructor(reason: PhotoWallModerationFailureReason) {
    super(`Photo wall moderation failed: ${reason}`);
    this.name = "PhotoWallModerationError";
    this.reason = reason;

    switch (reason) {
      case "admin_user_inactive":
        this.statusCode = 403;
        break;
      case "photo_post_already_removed":
      case "photo_post_already_in_target_status":
        this.statusCode = 409;
        break;
      default:
        this.statusCode = 404;
        break;
    }
  }
}
