import type { FastifyPluginAsync } from "fastify";
import { registerGiftRegistryRoutes } from "./routes/index.js";

export const GIFT_REGISTRY_MODULE = "gift-registry";

export const registerGiftRegistryModule: FastifyPluginAsync = async (app) => {
  await app.register(registerGiftRegistryRoutes);
};
