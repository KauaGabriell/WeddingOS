import type { FastifyPluginAsync } from "fastify";
import { PHOTO_WALL_HTTP_CONTRACT } from "../contracts/index.js";

export const registerPhotoWallRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: PHOTO_WALL_HTTP_CONTRACT.routePrefix,
  });
};
