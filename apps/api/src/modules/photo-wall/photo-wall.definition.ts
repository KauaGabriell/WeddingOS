import { defineModuleDefinition } from "../shared/module-definition.js";
import { PHOTO_WALL_HTTP_CONTRACT } from "./contracts/http-contracts.js";

export const PHOTO_WALL_MODULE_DEFINITION = defineModuleDefinition({
  module: "photo-wall",
  routePrefix: PHOTO_WALL_HTTP_CONTRACT.routePrefix,
  layers: {
    routes: {
      path: "routes",
      purpose: "Fastify plugins and handlers for public gallery and moderation endpoints.",
    },
    application: {
      path: "application",
      purpose: "Use cases for photo submission, moderation decisions, and gallery listing.",
    },
    domain: {
      path: "domain",
      purpose: "Photo wall entities, moderation rules, and repository interfaces.",
    },
    infrastructure: {
      path: "infrastructure",
      purpose: "Persistence adapters and external providers for storage and moderation.",
    },
    contracts: {
      path: "contracts",
      purpose: "HTTP schemas, DTOs, and route metadata for photo wall flows.",
    },
  },
});
