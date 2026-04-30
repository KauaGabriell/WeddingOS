import { defineModuleDefinition } from "../shared/module-definition.js";
import { ADMIN_BACKOFFICE_HTTP_CONTRACT } from "./contracts/http-contracts.js";

export const ADMIN_BACKOFFICE_MODULE_DEFINITION = defineModuleDefinition({
  module: "admin-backoffice",
  routePrefix: ADMIN_BACKOFFICE_HTTP_CONTRACT.routePrefix,
  layers: {
    routes: {
      path: "routes",
      purpose: "Fastify plugins and handlers for administrative management endpoints.",
    },
    application: {
      path: "application",
      purpose: "Use cases for audits, dashboards, and administrative orchestration flows.",
    },
    domain: {
      path: "domain",
      purpose: "Administrative entities, audit rules, and repository interfaces.",
    },
    infrastructure: {
      path: "infrastructure",
      purpose: "Persistence adapters and providers needed by backoffice workflows.",
    },
    contracts: {
      path: "contracts",
      purpose: "HTTP schemas, DTOs, and route metadata for administrative APIs.",
    },
  },
});
