export interface PhotoWallInfrastructurePorts {
  readonly repositories: readonly ["photo-post-repository"];
  readonly providers: readonly ["photo-storage-provider", "image-moderation-provider"];
}

export const PHOTO_WALL_INFRASTRUCTURE_PORTS: PhotoWallInfrastructurePorts = {
  repositories: ["photo-post-repository"],
  providers: ["photo-storage-provider", "image-moderation-provider"],
};
