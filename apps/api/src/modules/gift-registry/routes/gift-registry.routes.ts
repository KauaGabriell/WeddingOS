import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";
import { PrismaAuditLogRepository, createAuditLogWriter } from "../../admin-backoffice/index.js";
import { PrismaGuestRepository } from "../../guests-rsvp/index.js";
import {
  errorResponseSchema,
  guestRoute,
  type GuestPrincipal,
  type HttpStatusError,
} from "../../shared/index.js";
import {
  createReserveGiftUseCase,
  createListPublicGiftCatalogUseCase,
  GIFT_REGISTRY_HTTP_CONTRACT,
  GIFT_REGISTRY_HTTP_SCHEMAS,
  GiftRegistryApplicationError,
  GiftReservationConflictError,
  type GiftRegistryGiftCatalogQueryDto,
  type GiftRegistryReserveGiftRequestDto,
  PrismaGiftRepository,
  PrismaGiftReservationRepository,
  PrismaGiftReservationTransactionRunner,
} from "../index.js";

export const GIFT_REGISTRY_ROUTE_ACCESS = {
  listGifts: guestRoute(),
  reserveGift: guestRoute(),
};

interface RegisterGiftRegistryRoutesOptions {
  readonly preHandler?: preHandlerHookHandler;
}

function serializeGift(gift: {
  id: string;
  name: string;
  category: string;
  description: string | null;
  estimatedValue: number | null;
  imageUrl: string | null;
  displayOrder: number;
  status: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...gift,
    createdAt: gift.createdAt.toISOString(),
    updatedAt: gift.updatedAt.toISOString(),
  };
}

function serializeReservation(reservation: {
  id: string;
  giftId: string;
  guestId: string;
  reservationStatus: string;
  purchaseNotes: string | null;
  reservedAt: Date;
  releasedAt: Date | null;
  releasedByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null) {
  if (reservation === null) {
    return null;
  }

  return {
    ...reservation,
    reservedAt: reservation.reservedAt.toISOString(),
    releasedAt: reservation.releasedAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

export const registerGiftRegistryRoutes: FastifyPluginAsync<RegisterGiftRegistryRoutesOptions> = async (
  app,
  options,
) => {
  const guestRepository = new PrismaGuestRepository(
    app.prisma.guest as unknown as ConstructorParameters<typeof PrismaGuestRepository>[0],
  );
  const giftRepository = new PrismaGiftRepository(
    app.prisma.gift as unknown as ConstructorParameters<typeof PrismaGiftRepository>[0],
  );
  const giftReservationRepository = new PrismaGiftReservationRepository(
    app.prisma.giftReservation as unknown as ConstructorParameters<
      typeof PrismaGiftReservationRepository
    >[0],
  );
  const giftReservationTransactionRunner = new PrismaGiftReservationTransactionRunner(app.prisma);
  const auditLogWriter = createAuditLogWriter({
    auditLogRepository: new PrismaAuditLogRepository(
      app.prisma.auditLog as unknown as ConstructorParameters<typeof PrismaAuditLogRepository>[0],
    ),
  });
  const listPublicGiftCatalog = createListPublicGiftCatalogUseCase({
    giftRepository,
    giftReservationRepository,
  });
  const reserveGift = createReserveGiftUseCase({
    guestRepository,
    giftRepository,
    giftReservationTransactionRunner,
    auditLogWriter,
  });

  await app.register(async (giftRoutes) => {
    giftRoutes.setErrorHandler((error, _request, reply) => {
      const httpError = error as Partial<HttpStatusError>;

      if (httpError.statusCode === 401) {
        return reply.code(401).send({
          code: "GUEST_AUTH_REQUIRED",
          message: "Authentication required",
        });
      }

      if (httpError.statusCode === 403) {
        return reply.code(403).send({
          code: "GUEST_ACCESS_FORBIDDEN",
          message: "Access forbidden",
        });
      }

      throw error;
    });

    giftRoutes.get("/", {
      ...GIFT_REGISTRY_ROUTE_ACCESS.listGifts,
      preHandler: options.preHandler,
      schema: {
        tags: [...GIFT_REGISTRY_HTTP_CONTRACT.tags],
        querystring: GIFT_REGISTRY_HTTP_SCHEMAS.queries.giftCatalog,
        response: {
          200: GIFT_REGISTRY_HTTP_SCHEMAS.responses.giftCatalogList,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const query = request.query as GiftRegistryGiftCatalogQueryDto;
        const result = await listPublicGiftCatalog.execute({
          category: query.category,
          status: query.status,
          reservationStatus: query.reservationStatus,
          minEstimatedValue: query.minEstimatedValue,
          maxEstimatedValue: query.maxEstimatedValue,
          page: query.page,
          pageSize: query.pageSize,
        });

        return reply.code(200).send({
          items: result.items.map((item) => ({
            gift: serializeGift(item.gift),
            activeReservation: serializeReservation(item.activeReservation),
          })),
          page: result.page,
          pageSize: result.pageSize,
        });
      },
    });

    giftRoutes.post("/:giftId/reserve", {
      ...GIFT_REGISTRY_ROUTE_ACCESS.reserveGift,
      preHandler: options.preHandler,
      schema: {
        tags: [...GIFT_REGISTRY_HTTP_CONTRACT.tags],
        params: GIFT_REGISTRY_HTTP_SCHEMAS.params.giftId,
        body: GIFT_REGISTRY_HTTP_SCHEMAS.bodies.reserveGift,
        response: {
          200: GIFT_REGISTRY_HTTP_SCHEMAS.responses.giftReservation,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const auth = request.auth as GuestPrincipal;
        const params = request.params as { giftId: string };
        const body = request.body as GiftRegistryReserveGiftRequestDto;

        try {
          const reservation = await reserveGift.execute({
            giftId: params.giftId,
            guestId: auth.guestId,
            purchaseNotes: body.purchaseNotes,
            requestId: request.correlationId,
          });

          return reply.code(200).send(serializeReservation(reservation));
        } catch (error) {
          if (error instanceof GiftReservationConflictError) {
            return reply.code(409).send({
              code: "GIFT_RESERVATION_CONFLICT",
              message: "Request could not be completed",
            });
          }

          if (error instanceof GiftRegistryApplicationError) {
            const codeByReason: Record<GiftRegistryApplicationError["reason"], string> = {
              guest_not_found: "GUEST_NOT_FOUND",
              guest_inactive: "GUEST_INACTIVE",
              gift_not_found: "GIFT_NOT_FOUND",
              gift_inactive: "GIFT_INACTIVE",
              gift_unavailable: "GIFT_UNAVAILABLE",
            };

            return reply.code(error.statusCode).send({
              code: codeByReason[error.reason],
              message: "Request could not be completed",
            });
          }

          throw error;
        }
      },
    });
  }, {
    prefix: GIFT_REGISTRY_HTTP_CONTRACT.routePrefix,
  });
};
