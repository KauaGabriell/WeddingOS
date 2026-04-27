import type { FastifyPluginAsync } from "fastify";
import { registerPhotoWallRoutes } from "./routes/index.js";

export const PHOTO_WALL_MODULE = "photo-wall";

export const registerPhotoWallModule: FastifyPluginAsync = async (app) => {
  await app.register(registerPhotoWallRoutes);
};
