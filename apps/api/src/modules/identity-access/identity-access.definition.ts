import { IDENTITY_ACCESS_HTTP_CONTRACT } from "./contracts/http-contracts.js";
import { defineModuleDefinition } from "../shared/module-definition.js";

export const IDENTITY_ACCESS_MODULE_DEFINITION = defineModuleDefinition({
  module: "identity-access",
  routePrefix: IDENTITY_ACCESS_HTTP_CONTRACT.routePrefix,
  layers: {
    routes: {
      path: "routes",
      purpose: "Fastify plugins and route handlers for guest and admin authentication endpoints.",
    },
    application: {
      path: "application",
      purpose: "Use cases for guest login, admin login, and invite token lifecycle flows.",
    },
    domain: {
      path: "domain",
      purpose: "Authentication entities, repository interfaces, and business rules.",
    },
    infrastructure: {
      path: "infrastructure",
      purpose: "Repository implementations, auth providers, and token adapters.",
    },
    contracts: {
      path: "contracts",
      purpose: "HTTP schemas, DTOs, and module route metadata.",
    },
  },
});
