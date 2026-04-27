import type { FastifyPluginAsync } from "fastify";
import { GIFT_REGISTRY_HTTP_CONTRACT } from "../contracts/index.js";

export const registerGiftRegistryRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: GIFT_REGISTRY_HTTP_CONTRACT.routePrefix,
  });
};
