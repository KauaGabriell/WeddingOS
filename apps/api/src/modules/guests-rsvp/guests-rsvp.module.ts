import type { FastifyPluginAsync } from "fastify";
import { registerGuestsRsvpRoutes } from "./routes/index.js";

export const GUESTS_RSVP_MODULE = "guests-rsvp";

export const registerGuestsRsvpModule: FastifyPluginAsync = async (app) => {
  await app.register(registerGuestsRsvpRoutes);
};
