import "fastify";
import type { AdminSessionVerifier } from "./modules/identity-access/infrastructure/index.js";
import type { StorageClient } from "./modules/shared/platform/storage/storage-client.js";

declare module "fastify" {
  interface FastifyInstance {
    storageClient: StorageClient;
    adminSessionVerifier: AdminSessionVerifier;
  }
}
