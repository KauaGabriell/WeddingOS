import { defineModuleDefinition } from "../shared/module-definition.js";
import { GIFT_REGISTRY_HTTP_CONTRACT } from "./contracts/http-contracts.js";

export const GIFT_REGISTRY_MODULE_DEFINITION = defineModuleDefinition({
  module: "gift-registry",
  routePrefix: GIFT_REGISTRY_HTTP_CONTRACT.routePrefix,
  layers: {
    routes: {
      path: "routes",
      purpose: "Fastify plugins and handlers for public catalog and administrative gift flows.",
    },
    application: {
      path: "application",
      purpose: "Use cases for listing gifts, reserving items, and admin reservation management.",
    },
    domain: {
      path: "domain",
      purpose: "Gift entities, reservation rules, and repository interfaces.",
    },
    infrastructure: {
      path: "infrastructure",
      purpose: "Persistence adapters and external providers for payment proof and storage.",
    },
    contracts: {
      path: "contracts",
      purpose: "HTTP schemas, DTOs, and module metadata for public and admin gift endpoints.",
    },
  },
});
