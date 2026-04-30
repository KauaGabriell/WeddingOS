import type { FastifyPluginAsync } from "fastify";
import { guestRoute } from "../../shared/index.js";
import { GIFT_REGISTRY_HTTP_CONTRACT } from "../contracts/index.js";

export const GIFT_REGISTRY_ROUTE_ACCESS = {
  listGifts: guestRoute(),
  reserveGift: guestRoute(),
};

export const registerGiftRegistryRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: GIFT_REGISTRY_HTTP_CONTRACT.routePrefix,
  });
};
