import { defineModuleDefinition } from "../shared/module-definition.js";
import { GUESTS_RSVP_HTTP_CONTRACT } from "./contracts/http-contracts.js";

export const GUESTS_RSVP_MODULE_DEFINITION = defineModuleDefinition({
  module: "guests-rsvp",
  routePrefix: GUESTS_RSVP_HTTP_CONTRACT.routePrefix,
  layers: {
    routes: {
      path: "routes",
      purpose: "Fastify plugins and handlers for guest home, events, and RSVP endpoints.",
    },
    application: {
      path: "application",
      purpose: "Use cases for invitation overview, eligibility lookup, and RSVP submission.",
    },
    domain: {
      path: "domain",
      purpose: "Guest, event, RSVP entities and repository interfaces for domain rules.",
    },
    infrastructure: {
      path: "infrastructure",
      purpose: "Persistence adapters, outbound invite delivery providers, and integrations.",
    },
    contracts: {
      path: "contracts",
      purpose: "HTTP schemas, DTOs, and route metadata for guest-facing and admin flows.",
    },
  },
});
