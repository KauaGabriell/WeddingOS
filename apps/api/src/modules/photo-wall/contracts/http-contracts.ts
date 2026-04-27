export interface PhotoWallHttpContract {
  readonly module: "photo-wall";
  readonly routePrefix: "/photos";
  readonly tags: readonly ["photo-wall"];
}

export const PHOTO_WALL_HTTP_CONTRACT: PhotoWallHttpContract = {
  module: "photo-wall",
  routePrefix: "/photos",
  tags: ["photo-wall"],
};
