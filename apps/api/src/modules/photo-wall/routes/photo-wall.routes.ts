import type { FastifyPluginAsync } from "fastify";
import { guestRoute } from "../../shared/index.js";
import { PHOTO_WALL_HTTP_CONTRACT } from "../contracts/index.js";

export const PHOTO_WALL_ROUTE_ACCESS = {
  listPhotoWallPosts: guestRoute(),
  createPhotoPost: guestRoute(),
};

export const registerPhotoWallRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: PHOTO_WALL_HTTP_CONTRACT.routePrefix,
  });
};
