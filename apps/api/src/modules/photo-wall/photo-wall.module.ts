import type { FastifyPluginAsync } from "fastify";
import { createGuestAuthGuardWithFallback } from "../identity-access/index.js";
import { requireGuestAuth } from "../shared/index.js";
import { registerPhotoWallRoutes } from "./routes/index.js";

export const PHOTO_WALL_MODULE = "photo-wall";

export const registerPhotoWallModule: FastifyPluginAsync = async (app) => {
  await app.register(registerPhotoWallRoutes, {
    preHandler: requireGuestAuth(
      createGuestAuthGuardWithFallback(app.guestSessionService, app.adminSessionVerifier),
    ),
  });
};
