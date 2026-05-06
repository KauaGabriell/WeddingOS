import { runAdminRouteTests } from "./admin-routes.test.js";
import { runAdminBackofficeApplicationTests } from "./admin-backoffice/application.test.js";
import { runAdminBackofficeInfrastructureTests } from "./admin-backoffice/infrastructure.test.js";
import { runBootstrapTests } from "./bootstrap.test.js";
import { runGiftRegistryApplicationTests } from "./gift-registry/application.test.js";
import { runGiftRegistryInfrastructureTests } from "./gift-registry/infrastructure.test.js";
import { runGuestsRsvpApplicationTests } from "./guests-rsvp/application.test.js";
import { runGuestsRsvpAdminQueryTests } from "./guests-rsvp/admin-query.test.js";
import { runGuestsRsvpInfrastructureTests } from "./guests-rsvp/infrastructure.test.js";
import { runIdentityAccessApplicationTests } from "./identity-access/application.test.js";
import { runIdentityAccessInfrastructureTests } from "./identity-access/infrastructure.test.js";
import { runModuleContractTests } from "./module-contracts.test.js";
import { runPhotoWallApplicationTests } from "./photo-wall/application.test.js";
import { runPhotoWallInfrastructureTests } from "./photo-wall/infrastructure.test.js";
import { runSharedHttpAuthTests } from "./shared/http-auth.test.js";

async function run(): Promise<void> {
  await runBootstrapTests();
  await runModuleContractTests();
  await runSharedHttpAuthTests();
  await runAdminBackofficeApplicationTests();
  await runAdminBackofficeInfrastructureTests();
  await runIdentityAccessApplicationTests();
  await runIdentityAccessInfrastructureTests();
  await runGiftRegistryApplicationTests();
  await runGiftRegistryInfrastructureTests();
  await runGuestsRsvpApplicationTests();
  await runGuestsRsvpAdminQueryTests();
  await runGuestsRsvpInfrastructureTests();
  await runPhotoWallApplicationTests();
  await runPhotoWallInfrastructureTests();
  await runAdminRouteTests();
  console.log("api test suites passed");
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
