import type { FastifyPluginAsync } from "fastify";
import { guestRoute } from "../../shared/index.js";
import { GUESTS_RSVP_HTTP_CONTRACT } from "../contracts/index.js";

export const GUESTS_RSVP_ROUTE_ACCESS = {
  guestHome: guestRoute(),
  listEvents: guestRoute(),
  submitRsvp: guestRoute(),
};

export const registerGuestsRsvpRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async () => {}, {
    prefix: GUESTS_RSVP_HTTP_CONTRACT.routePrefix,
  });
};
