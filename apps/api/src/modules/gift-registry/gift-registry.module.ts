import type { FastifyPluginAsync } from "fastify";
import { createGuestAuthGuardWithFallback } from "../identity-access/index.js";
import { requireGuestAuth } from "../shared/index.js";
import { registerGiftRegistryRoutes } from "./routes/index.js";

export const GIFT_REGISTRY_MODULE = "gift-registry";

export const registerGiftRegistryModule: FastifyPluginAsync = async (app) => {
  await app.register(registerGiftRegistryRoutes, {
    preHandler: requireGuestAuth(
      createGuestAuthGuardWithFallback(app.guestSessionService, app.adminSessionVerifier),
    ),
  });
};
