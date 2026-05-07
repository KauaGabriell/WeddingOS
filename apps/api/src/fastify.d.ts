import "fastify";
import type { PrismaClient } from "./generated/prisma/client.js";
import type {
  AdminSessionVerifier,
  SignedAdminSessionService,
  SignedAdminMagicLinkService,
} from "./modules/identity-access/infrastructure/index.js";
import type { StorageClient } from "./modules/shared/platform/storage/storage-client.js";
import type { SignedGuestSessionService } from "./modules/identity-access/infrastructure/guest-session.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    storageClient: StorageClient;
    adminSessionVerifier: AdminSessionVerifier;
    adminSessionService: SignedAdminSessionService;
    adminMagicLinkService: SignedAdminMagicLinkService;
    guestSessionService: SignedGuestSessionService;
  }
}
