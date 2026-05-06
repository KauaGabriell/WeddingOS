export type PhotoWallFailureReason = "guest_not_found" | "guest_inactive";

export class PhotoWallApplicationError extends Error {
  readonly reason: PhotoWallFailureReason;
  readonly statusCode: 403 | 404;

  constructor(reason: PhotoWallFailureReason) {
    super(`Photo wall operation failed: ${reason}`);
    this.name = "PhotoWallApplicationError";
    this.reason = reason;
    this.statusCode = reason === "guest_inactive" ? 403 : 404;
  }
}
