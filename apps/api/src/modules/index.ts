import type { FastifyPluginAsync } from "fastify";
import { registerAdminBackofficeModule } from "./admin-backoffice/index.js";
import { registerGiftRegistryModule } from "./gift-registry/index.js";
import { registerGuestsRsvpModule } from "./guests-rsvp/index.js";
import { registerIdentityAccessModule } from "./identity-access/index.js";
import { registerPhotoWallModule } from "./photo-wall/index.js";

export const MODULE_NAMES = [
  "identity-access",
  "guests-rsvp",
  "gift-registry",
  "photo-wall",
  "admin-backoffice",
] as const;

export const MODULE_REGISTRATIONS: FastifyPluginAsync[] = [
  registerIdentityAccessModule,
  registerGuestsRsvpModule,
  registerGiftRegistryModule,
  registerPhotoWallModule,
  registerAdminBackofficeModule,
];
