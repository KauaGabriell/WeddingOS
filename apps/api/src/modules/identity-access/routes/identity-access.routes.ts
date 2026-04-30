import type { FastifyPluginAsync } from "fastify";
import { publicRoute } from "../../shared/index.js";
import { IDENTITY_ACCESS_HTTP_CONTRACT } from "../contracts/index.js";

export const IDENTITY_ACCESS_ROUTE_ACCESS = {
  requestGuestAccess: publicRoute(),
  loginWithInviteToken: publicRoute(),
  loginWithShortCode: publicRoute(),
  adminLogin: publicRoute(),
};

export const registerIdentityAccessRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: IDENTITY_ACCESS_HTTP_CONTRACT.routePrefix,
  });
};
