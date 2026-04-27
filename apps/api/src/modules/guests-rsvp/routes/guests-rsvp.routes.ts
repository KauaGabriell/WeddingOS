import type { FastifyPluginAsync } from "fastify";
import { GUESTS_RSVP_HTTP_CONTRACT } from "../contracts/index.js";

export const registerGuestsRsvpRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: GUESTS_RSVP_HTTP_CONTRACT.routePrefix,
  });
};
