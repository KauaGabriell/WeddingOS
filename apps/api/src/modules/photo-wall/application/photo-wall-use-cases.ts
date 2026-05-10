export interface PhotoWallModuleUseCases {
  readonly photoSubmission: "planned" | "implemented";
  readonly moderationReview: "planned" | "implemented";
  readonly galleryListing: "planned" | "implemented";
}

export const PHOTO_WALL_MODULE_USE_CASES: PhotoWallModuleUseCases = {
  photoSubmission: "implemented",
  moderationReview: "implemented",
  galleryListing: "implemented",
};
