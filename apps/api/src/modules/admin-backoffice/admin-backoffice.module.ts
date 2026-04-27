import type { FastifyPluginAsync } from "fastify";
import { registerAdminBackofficeRoutes } from "./routes/index.js";

export const ADMIN_BACKOFFICE_MODULE = "admin-backoffice";

export const registerAdminBackofficeModule: FastifyPluginAsync = async (app) => {
  await app.register(registerAdminBackofficeRoutes);
};
