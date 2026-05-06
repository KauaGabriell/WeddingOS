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
