import type { FastifyPluginAsync } from "fastify";
import { registerIdentityAccessRoutes } from "./routes/index.js";

export const IDENTITY_ACCESS_MODULE = "identity-access";

export const registerIdentityAccessModule: FastifyPluginAsync = async (app) => {
  await app.register(registerIdentityAccessRoutes);
};
