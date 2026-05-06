export interface PhotoWallHttpContract {
  readonly module: "photo-wall";
  readonly routePrefix: "/photo-wall";
  readonly tags: readonly ["photo-wall"];
}

export const PHOTO_WALL_HTTP_CONTRACT: PhotoWallHttpContract = {
  module: "photo-wall",
  routePrefix: "/photo-wall",
  tags: ["photo-wall"],
};
