import type { FastifyPluginAsync } from "fastify";
import { createAdminAuthGuard } from "../identity-access/index.js";
import { requireAdminAuth } from "../shared/index.js";
import { registerAdminBackofficeRoutes } from "./routes/index.js";

export const ADMIN_BACKOFFICE_MODULE = "admin-backoffice";

export const registerAdminBackofficeModule: FastifyPluginAsync = async (app) => {
  await app.register(registerAdminBackofficeRoutes, {
    preHandler: requireAdminAuth(createAdminAuthGuard(app.adminSessionVerifier)),
  });
};
