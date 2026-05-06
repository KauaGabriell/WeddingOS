import type { FastifyPluginAsync } from "fastify";
import { createGuestAuthGuardWithFallback } from "../identity-access/index.js";
import { requireGuestAuth } from "../shared/index.js";
import { registerGuestsRsvpRoutes } from "./routes/index.js";

export const GUESTS_RSVP_MODULE = "guests-rsvp";

export const registerGuestsRsvpModule: FastifyPluginAsync = async (app) => {
  await app.register(registerGuestsRsvpRoutes, {
    preHandler: requireGuestAuth(
      createGuestAuthGuardWithFallback(app.guestSessionService, app.adminSessionVerifier),
    ),
  });
};
