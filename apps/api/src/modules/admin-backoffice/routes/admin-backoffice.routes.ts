import type { FastifyPluginAsync } from "fastify";
import { adminRoute } from "../../shared/index.js";
import { ADMIN_BACKOFFICE_HTTP_CONTRACT } from "../contracts/index.js";

export const ADMIN_BACKOFFICE_ROUTE_ACCESS = {
  dashboard: adminRoute(),
  listGuests: adminRoute(),
  listRsvps: adminRoute(),
  listGifts: adminRoute(),
  listPhotoWallPosts: adminRoute(),
};

export const registerAdminBackofficeRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: ADMIN_BACKOFFICE_HTTP_CONTRACT.routePrefix,
  });
};
