import type { FastifyPluginAsync } from "fastify";
import { ADMIN_BACKOFFICE_HTTP_CONTRACT } from "../contracts/index.js";

export const registerAdminBackofficeRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: ADMIN_BACKOFFICE_HTTP_CONTRACT.routePrefix,
  });
};
