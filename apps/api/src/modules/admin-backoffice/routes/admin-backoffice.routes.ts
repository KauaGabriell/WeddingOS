import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";
import { adminRoute } from "../../shared/index.js";
import { ADMIN_BACKOFFICE_HTTP_CONTRACT } from "../contracts/index.js";

export const ADMIN_BACKOFFICE_ROUTE_ACCESS = {
  dashboard: adminRoute(),
  listGuests: adminRoute(),
  listRsvps: adminRoute(),
  listGifts: adminRoute(),
  listPhotoWallPosts: adminRoute(),
};

interface RegisterAdminBackofficeRoutesOptions {
  readonly preHandler?: preHandlerHookHandler;
}

export const registerAdminBackofficeRoutes: FastifyPluginAsync<RegisterAdminBackofficeRoutesOptions> =
  async (app, options) => {
    await app.register(async (protectedRoutes) => {
      protectedRoutes.get("/dashboard", {
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
        },
        handler: async (_request, reply) => {
          return reply.code(501).send({
            code: "ADMIN_DASHBOARD_NOT_IMPLEMENTED",
            message: "Admin dashboard route is protected but not implemented yet",
          });
        },
      });
    }, {
      prefix: ADMIN_BACKOFFICE_HTTP_CONTRACT.routePrefix,
    });
  };
