import type { FastifyPluginAsync } from "fastify";
import { IDENTITY_ACCESS_HTTP_CONTRACT } from "../contracts/index.js";

export const registerIdentityAccessRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: IDENTITY_ACCESS_HTTP_CONTRACT.routePrefix,
  });
};
