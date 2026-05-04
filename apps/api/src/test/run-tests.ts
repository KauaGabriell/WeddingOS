import { runAdminRouteTests } from "./admin-routes.test.js";
import { runBootstrapTests } from "./bootstrap.test.js";
import { runGuestsRsvpApplicationTests } from "./guests-rsvp/application.test.js";
import { runGuestsRsvpInfrastructureTests } from "./guests-rsvp/infrastructure.test.js";
import { runIdentityAccessApplicationTests } from "./identity-access/application.test.js";
import { runIdentityAccessInfrastructureTests } from "./identity-access/infrastructure.test.js";
import { runModuleContractTests } from "./module-contracts.test.js";
import { runSharedHttpAuthTests } from "./shared/http-auth.test.js";

async function run(): Promise<void> {
  await runBootstrapTests();
  await runModuleContractTests();
  await runSharedHttpAuthTests();
  await runIdentityAccessApplicationTests();
  await runIdentityAccessInfrastructureTests();
  await runGuestsRsvpApplicationTests();
  await runGuestsRsvpInfrastructureTests();
  await runAdminRouteTests();
  console.log("api test suites passed");
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
