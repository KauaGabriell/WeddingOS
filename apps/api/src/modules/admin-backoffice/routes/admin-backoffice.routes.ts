import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";
import {
  errorResponseSchema,
  type HttpStatusError,
  adminRoute,
  type AdminPrincipal,
} from "../../shared/index.js";
import {
  GUESTS_RSVP_HTTP_SCHEMAS,
  GuestsRsvpApplicationError,
  PrismaEventGuestEligibilityRepository,
  PrismaGuestGroupRepository,
  PrismaGuestRepository,
  PrismaRsvpResponseRepository,
  createListAdminGuestsAndRsvpsUseCase,
  createManageAdminGuestUseCase,
  type EventGuestEligibility,
  type Guest,
  type GuestGroup,
  type GuestsRsvpAdminGuestListQueryDto,
  type GuestsRsvpAdminRsvpListQueryDto,
  type RsvpResponse,
} from "../../guests-rsvp/index.js";
import {
  GIFT_REGISTRY_HTTP_SCHEMAS,
  PrismaGiftReservationRepository,
  PrismaGiftRepository,
  createListAdminGiftsUseCase,
  createListPublicGiftCatalogUseCase,
  createCreateGiftUseCase,
  createUpdateGiftUseCase,
  AdminGiftManagementError,
  type GiftRegistryGiftCatalogQueryDto,
  type GiftRegistryUpsertGiftRequestDto,
} from "../../gift-registry/index.js";
import {
  PHOTO_WALL_HTTP_SCHEMAS,
  PrismaPhotoPostRepository,
  StorageBackedPhotoStorageProvider,
  createListModerationPhotoPostsUseCase,
  createModeratePhotoPostUseCase,
  PhotoWallModerationError,
} from "../../photo-wall/index.js";
import { PrismaAdminUserRepository } from "../../identity-access/index.js";
import {
  PrismaAuditLogRepository,
  createAuditLogWriter,
  createGetDashboardSummaryUseCase,
  createListAuditTrailUseCase,
} from "../index.js";
import {
  ADMIN_BACKOFFICE_HTTP_CONTRACT,
  ADMIN_BACKOFFICE_HTTP_SCHEMAS,
} from "../contracts/index.js";

export const ADMIN_BACKOFFICE_ROUTE_ACCESS = {
  dashboard: adminRoute(),
  listGuests: adminRoute(),
  updateGuest: adminRoute(),
  deleteGuest: adminRoute(),
  listRsvps: adminRoute(),
  listGifts: adminRoute(),
  listGiftReservations: adminRoute(),
  createGift: adminRoute(),
  updateGift: adminRoute(),
  listPhotoWallPosts: adminRoute(),
  moderatePhotoPost: adminRoute(),
  listAuditLogs: adminRoute(),
};

interface RegisterAdminBackofficeRoutesOptions {
  readonly preHandler?: preHandlerHookHandler;
}

function sendGuestsError(error: GuestsRsvpApplicationError, reply: any) {
  const codeByReason: Record<GuestsRsvpApplicationError["reason"], string> = {
    guest_not_found: "GUEST_NOT_FOUND",
    guest_inactive: "GUEST_INACTIVE",
    guest_group_not_found: "GUEST_GROUP_NOT_FOUND",
    companions_limit_exceeded: "COMPANIONS_LIMIT_EXCEEDED",
    event_not_found: "EVENT_NOT_FOUND",
    event_not_eligible: "EVENT_NOT_ELIGIBLE",
    event_rsvp_blocked: "EVENT_RSVP_BLOCKED",
  };

  return reply.code(error.statusCode).send({
    code: codeByReason[error.reason],
    message: "Request could not be completed",
  });
}

function sendGiftsError(error: AdminGiftManagementError, reply: any) {
  const codeByReason: Record<AdminGiftManagementError["reason"], string> = {
    gift_not_found: "GIFT_NOT_FOUND",
    invalid_value_range: "INVALID_VALUE_RANGE",
    archived_gift_must_be_inactive: "ARCHIVED_GIFT_MUST_BE_INACTIVE",
  };

  return reply.code(error.statusCode).send({
    code: codeByReason[error.reason],
    message: "Request could not be completed",
  });
}

function sendPhotoWallError(error: PhotoWallModerationError, reply: any) {
  const codeByReason: Record<PhotoWallModerationError["reason"], string> = {
    photo_post_not_found: "PHOTO_POST_NOT_FOUND",
    admin_user_not_found: "ADMIN_USER_NOT_FOUND",
    admin_user_inactive: "ADMIN_USER_INACTIVE",
    photo_post_already_removed: "PHOTO_POST_ALREADY_REMOVED",
    photo_post_already_in_target_status: "PHOTO_POST_ALREADY_IN_TARGET_STATUS",
  };

  return reply.code(error.statusCode).send({
    code: codeByReason[error.reason],
    message: "Request could not be completed",
  });
}

function serializeGuestGroup(guestGroup: GuestGroup) {
  return {
    ...guestGroup,
    createdAt: guestGroup.createdAt.toISOString(),
    updatedAt: guestGroup.updatedAt.toISOString(),
  };
}

function serializeGuest(guest: Guest) {
  return {
    ...guest,
    lastAccessAt: guest.lastAccessAt?.toISOString() ?? null,
    createdAt: guest.createdAt.toISOString(),
    updatedAt: guest.updatedAt.toISOString(),
  };
}

function serializeEligibility(entry: EventGuestEligibility) {
  return {
    ...entry,
    createdAt: entry.createdAt.toISOString(),
  };
}

function serializeRsvpResponse(response: RsvpResponse) {
  return {
    id: response.id,
    eventId: response.eventId,
    guestId: response.guestId,
    responseStatus: response.responseStatus,
    companionsConfirmed: response.companionsConfirmed,
    companionNames: response.companionNames,
    message: response.message,
    respondedAt: response.respondedAt.toISOString(),
    createdAt: response.createdAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  };
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

function serializeGiftReservation(reservation: {
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
}) {
  return {
    ...reservation,
    reservedAt: reservation.reservedAt.toISOString(),
    releasedAt: reservation.releasedAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

function serializePhotoPost(photoPost: {
  id: string;
  guestId: string;
  authorName: string;
  message: string;
  mediaStorageKey: string;
  mediaUrl: string | null;
  mediaMimeType: string;
  mediaSizeBytes: number;
  mediaWidth: number | null;
  mediaHeight: number | null;
  moderationStatus: string;
  submittedAt: Date;
  approvedAt: Date | null;
  hiddenAt: Date | null;
  moderatedByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...photoPost,
    submittedAt: photoPost.submittedAt.toISOString(),
    approvedAt: photoPost.approvedAt?.toISOString() ?? null,
    hiddenAt: photoPost.hiddenAt?.toISOString() ?? null,
    createdAt: photoPost.createdAt.toISOString(),
    updatedAt: photoPost.updatedAt.toISOString(),
  };
}

function serializeAuditLog(auditLog: any) {
  return {
    ...auditLog,
    createdAt: auditLog.createdAt.toISOString(),
  };
}

export const registerAdminBackofficeRoutes: FastifyPluginAsync<
  RegisterAdminBackofficeRoutesOptions
> = async (app, options) => {
  const auditLogRepository = new PrismaAuditLogRepository(
    app.prisma.auditLog as unknown as ConstructorParameters<
      typeof PrismaAuditLogRepository
    >[0],
  );
  const auditLogWriter = createAuditLogWriter({ auditLogRepository });

  const guestRepository = new PrismaGuestRepository(
    app.prisma.guest as unknown as ConstructorParameters<
      typeof PrismaGuestRepository
    >[0],
  );
  const guestGroupRepository = new PrismaGuestGroupRepository(
    app.prisma.guestGroup as unknown as ConstructorParameters<
      typeof PrismaGuestGroupRepository
    >[0],
  );
  const eventGuestEligibilityRepository =
    new PrismaEventGuestEligibilityRepository(
      app.prisma.eventGuestEligibility as unknown as ConstructorParameters<
        typeof PrismaEventGuestEligibilityRepository
      >[0],
    );
  const rsvpResponseRepository = new PrismaRsvpResponseRepository(
    app.prisma.rsvpResponse as unknown as ConstructorParameters<
      typeof PrismaRsvpResponseRepository
    >[0],
  );
  const listAdminGuests = createListAdminGuestsAndRsvpsUseCase({
    guestRepository,
    guestGroupRepository,
    eventGuestEligibilityRepository,
    rsvpResponseRepository,
  });
  const manageAdminGuest = createManageAdminGuestUseCase({
    guestRepository,
  });

  const giftRepository = new PrismaGiftRepository(
    app.prisma.gift as unknown as ConstructorParameters<
      typeof PrismaGiftRepository
    >[0],
  );
  const giftReservationRepository = new PrismaGiftReservationRepository(
    app.prisma.giftReservation as unknown as ConstructorParameters<
      typeof PrismaGiftReservationRepository
    >[0],
  );
  const giftDependencies = { giftRepository, auditLogWriter };
  const listAdminGifts = createListAdminGiftsUseCase(giftDependencies);
  const listPublicGiftCatalog = createListPublicGiftCatalogUseCase({
    giftRepository,
    giftReservationRepository,
  });
  const createGift = createCreateGiftUseCase(giftDependencies);
  const updateGift = createUpdateGiftUseCase(giftDependencies);

  const photoPostRepository = new PrismaPhotoPostRepository(
    app.prisma.photoPost as unknown as ConstructorParameters<
      typeof PrismaPhotoPostRepository
    >[0],
  );
  const photoStorageProvider = new StorageBackedPhotoStorageProvider(
    app.storageClient,
  );
  const adminUserRepository = new PrismaAdminUserRepository(
    app.prisma.adminUser as unknown as ConstructorParameters<
      typeof PrismaAdminUserRepository
    >[0],
  );
  const photoWallDependencies = {
    photoPostRepository,
    adminUserRepository,
    auditLogWriter,
  };
  const listModerationPhotoPosts = createListModerationPhotoPostsUseCase(
    photoWallDependencies,
  );
  const moderatePhotoPost = createModeratePhotoPostUseCase(
    photoWallDependencies,
  );

  const getDashboardSummary = createGetDashboardSummaryUseCase({
    prisma: app.prisma,
  });
  const listAuditTrail = createListAuditTrailUseCase({ auditLogRepository });

  await app.register(
    async (protectedRoutes) => {
      protectedRoutes.setErrorHandler((error, _request, reply) => {
        const httpError = error as Partial<HttpStatusError>;

        if (httpError.statusCode === 401) {
          return reply.code(401).send({
            code: "ADMIN_AUTH_REQUIRED",
            message: "Authentication required",
          });
        }

        if (httpError.statusCode === 403) {
          return reply.code(403).send({
            code: "ADMIN_ACCESS_FORBIDDEN",
            message: "Access forbidden",
          });
        }

        throw error;
      });

      protectedRoutes.get("/dashboard", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.dashboard,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          response: {
            200: ADMIN_BACKOFFICE_HTTP_SCHEMAS.responses.dashboardSummary,
            401: errorResponseSchema,
            403: errorResponseSchema,
          },
        },
        handler: async (_request, reply) => {
          const summary = await getDashboardSummary.execute();
          return reply.code(200).send(summary);
        },
      });

      protectedRoutes.get("/guests", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.listGuests,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          querystring: GUESTS_RSVP_HTTP_SCHEMAS.queries.adminGuestList,
          response: {
            200: GUESTS_RSVP_HTTP_SCHEMAS.responses.adminGuestList,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const query = request.query as GuestsRsvpAdminGuestListQueryDto;

          try {
            const result = await listAdminGuests.execute({
              eventId: query.eventId,
              guestGroupId: query.guestGroupId,
              guestStatus: query.status,
              search: query.search,
              page: query.page,
              pageSize: query.pageSize,
            });

            return reply.code(200).send({
              items: result.items.map((item) => ({
                guestGroup: serializeGuestGroup(item.guestGroup),
                guest: serializeGuest(item.guest),
                eligibility: item.eligibility.map(serializeEligibility),
                responses: item.responses.map(serializeRsvpResponse),
              })),
              page: result.page,
              pageSize: result.pageSize,
            });
          } catch (error) {
            if (error instanceof GuestsRsvpApplicationError) {
              return sendGuestsError(error, reply);
            }

            throw error;
          }
        },
      });

      protectedRoutes.patch("/guests/:guestId", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.updateGuest,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          params: GUESTS_RSVP_HTTP_SCHEMAS.params.adminGuestId,
          body: GUESTS_RSVP_HTTP_SCHEMAS.bodies.adminUpdateGuest,
          response: {
            200: GUESTS_RSVP_HTTP_SCHEMAS.responses.guest,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const params = request.params as { guestId: string };
          const body = request.body as {
            fullName?: string;
            phone?: string | null;
            status?: "active" | "inactive";
          };

          try {
            const guest = await manageAdminGuest.execute({
              guestId: params.guestId,
              fullName: body.fullName,
              phone: body.phone,
              status: body.status,
            });

            return reply.code(200).send(serializeGuest(guest));
          } catch (error) {
            if (error instanceof GuestsRsvpApplicationError) {
              return sendGuestsError(error, reply);
            }

            throw error;
          }
        },
      });

      protectedRoutes.delete("/guests/:guestId", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.deleteGuest,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          params: GUESTS_RSVP_HTTP_SCHEMAS.params.adminGuestId,
          response: {
            200: GUESTS_RSVP_HTTP_SCHEMAS.responses.deleteGuest,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            500: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const params = request.params as { guestId: string };
          const guest = await guestRepository.findById(params.guestId);

          if (!guest) {
            return sendGuestsError(
              new GuestsRsvpApplicationError("guest_not_found"),
              reply,
            );
          }

          try {
            await app.prisma.$transaction(async (transactionClient: any) => {
              const activeReservations =
                await transactionClient.giftReservation.findMany({
                  where: {
                    guestId: params.guestId,
                    reservationStatus: "ACTIVE",
                  },
                  select: {
                    giftId: true,
                  },
                });
              const activeReservedGiftIds = activeReservations.map(
                (reservation: { giftId: string }) => reservation.giftId,
              );

              await transactionClient.auditLog.updateMany({
                where: { actorGuestId: params.guestId },
                data: { actorGuestId: null },
              });
              await transactionClient.giftReservation.deleteMany({
                where: { guestId: params.guestId },
              });

              if (activeReservedGiftIds.length > 0) {
                await transactionClient.gift.updateMany({
                  where: {
                    id: { in: activeReservedGiftIds },
                    status: "RESERVED",
                  },
                  data: {
                    status: "AVAILABLE",
                    updatedAt: new Date(),
                  },
                });
              }

              await transactionClient.photoPost.deleteMany({
                where: { guestId: params.guestId },
              });
              await transactionClient.rsvpResponse.deleteMany({
                where: { guestId: params.guestId },
              });
              await transactionClient.eventGuestEligibility.deleteMany({
                where: { guestId: params.guestId },
              });
              await transactionClient.inviteToken.deleteMany({
                where: { guestId: params.guestId },
              });

              const remainingGuestsInGroup =
                await transactionClient.guest.count({
                  where: {
                    guestGroupId: guest.guestGroupId,
                    id: { not: params.guestId },
                  },
                });

              if (remainingGuestsInGroup === 0) {
                await transactionClient.inviteToken.deleteMany({
                  where: { guestGroupId: guest.guestGroupId },
                });
                await transactionClient.guestGroup.delete({
                  where: { id: guest.guestGroupId },
                });
              }

              await transactionClient.guest.delete({
                where: { id: params.guestId },
              });
            });
          } catch (error) {
            request.log.error(
              { error, guestId: params.guestId },
              "Failed to delete guest",
            );
            return reply.code(500).send({
              code: "DELETE_FAILED",
              message: "Request could not be completed",
            });
          }

          return reply.code(200).send({ success: true });
        },
      });

      protectedRoutes.get("/rsvps", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.listRsvps,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          querystring: GUESTS_RSVP_HTTP_SCHEMAS.queries.adminRsvpList,
          response: {
            200: GUESTS_RSVP_HTTP_SCHEMAS.responses.adminRsvpList,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const query = request.query as GuestsRsvpAdminRsvpListQueryDto;

          try {
            const result = await listAdminGuests.execute({
              eventId: query.eventId,
              guestGroupId: query.guestGroupId,
              responseStatus: query.responseStatus,
              search: query.search,
              page: query.page,
              pageSize: query.pageSize,
            });

            return reply.code(200).send({
              items: result.items.map((item) => ({
                guestGroup: serializeGuestGroup(item.guestGroup),
                guest: serializeGuest(item.guest),
                eligibility: item.eligibility.map(serializeEligibility),
                responses: item.responses.map(serializeRsvpResponse),
              })),
              page: result.page,
              pageSize: result.pageSize,
            });
          } catch (error) {
            if (error instanceof GuestsRsvpApplicationError) {
              return sendGuestsError(error, reply);
            }

            throw error;
          }
        },
      });

      protectedRoutes.get("/gifts", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.listGifts,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          querystring: GIFT_REGISTRY_HTTP_SCHEMAS.queries.giftCatalog,
          response: {
            200: GIFT_REGISTRY_HTTP_SCHEMAS.responses.adminGiftList,
            401: errorResponseSchema,
            403: errorResponseSchema,
            400: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const query = request.query as GiftRegistryGiftCatalogQueryDto;

          try {
            const result = await listAdminGifts.execute({
              category: query.category,
              status: query.status,
              minEstimatedValue: query.minEstimatedValue,
              maxEstimatedValue: query.maxEstimatedValue,
              page: query.page,
              pageSize: query.pageSize,
            });

            return reply.code(200).send({
              items: result.items.map(serializeGift),
              page: result.page,
              pageSize: result.pageSize,
            });
          } catch (error) {
            if (error instanceof AdminGiftManagementError) {
              return sendGiftsError(error, reply);
            }

            throw error;
          }
        },
      });

      protectedRoutes.get("/gifts/reservations", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.listGiftReservations,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          querystring: GIFT_REGISTRY_HTTP_SCHEMAS.queries.giftCatalog,
          response: {
            200: GIFT_REGISTRY_HTTP_SCHEMAS.responses.giftCatalogList,
            401: errorResponseSchema,
            403: errorResponseSchema,
            400: errorResponseSchema,
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
              activeReservation: item.activeReservation
                ? serializeGiftReservation(item.activeReservation)
                : null,
            })),
            page: result.page,
            pageSize: result.pageSize,
          });
        },
      });

      protectedRoutes.post("/gifts", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.createGift,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          body: GIFT_REGISTRY_HTTP_SCHEMAS.bodies.upsertGift,
          response: {
            200: GIFT_REGISTRY_HTTP_SCHEMAS.responses.gift,
            401: errorResponseSchema,
            403: errorResponseSchema,
            400: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const auth = request.auth as AdminPrincipal;
          const body = request.body as GiftRegistryUpsertGiftRequestDto;

          try {
            const gift = await createGift.execute({
              ...body,
              actorAdminUserId: auth.adminUserId,
              requestId: request.correlationId,
            });

            return reply.code(200).send(serializeGift(gift));
          } catch (error) {
            if (error instanceof AdminGiftManagementError) {
              return sendGiftsError(error, reply);
            }

            throw error;
          }
        },
      });

      protectedRoutes.patch("/gifts/:giftId", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.updateGift,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          params: GIFT_REGISTRY_HTTP_SCHEMAS.params.giftId,
          body: GIFT_REGISTRY_HTTP_SCHEMAS.bodies.upsertGift,
          response: {
            200: GIFT_REGISTRY_HTTP_SCHEMAS.responses.gift,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            400: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const auth = request.auth as AdminPrincipal;
          const params = request.params as { giftId: string };
          const body = request.body as GiftRegistryUpsertGiftRequestDto;

          try {
            const gift = await updateGift.execute({
              ...body,
              giftId: params.giftId,
              actorAdminUserId: auth.adminUserId,
              requestId: request.correlationId,
            });

            return reply.code(200).send(serializeGift(gift));
          } catch (error) {
            if (error instanceof AdminGiftManagementError) {
              return sendGiftsError(error, reply);
            }

            throw error;
          }
        },
      });

      protectedRoutes.get("/photo-wall", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.listPhotoWallPosts,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          querystring: PHOTO_WALL_HTTP_SCHEMAS.queries.moderationQueue,
          response: {
            200: PHOTO_WALL_HTTP_SCHEMAS.responses.moderationQueueList,
            401: errorResponseSchema,
            403: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const query = request.query as {
            moderationStatus?: any;
            page?: number;
            pageSize?: number;
          };

          const result = await listModerationPhotoPosts.execute({
            moderationStatus: query.moderationStatus,
            page: query.page,
            pageSize: query.pageSize,
          });

          const items = await Promise.all(
            result.items.map(async (item) => {
              const serialized = serializePhotoPost(item);
              if (!serialized.mediaStorageKey) {
                return serialized;
              }

              try {
                const mediaUrl = await photoStorageProvider.getSignedMediaUrl(
                  serialized.mediaStorageKey,
                );
                return {
                  ...serialized,
                  mediaUrl,
                };
              } catch {
                return serialized;
              }
            }),
          );

          return reply.code(200).send({
            items,
            page: result.page,
            pageSize: result.pageSize,
          });
        },
      });

      protectedRoutes.post("/photo-wall/posts/:photoPostId/moderate", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.moderatePhotoPost,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          params: PHOTO_WALL_HTTP_SCHEMAS.params.photoPostId,
          body: PHOTO_WALL_HTTP_SCHEMAS.bodies.moderatePhotoPost,
          response: {
            200: PHOTO_WALL_HTTP_SCHEMAS.responses.photoPost,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
            400: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const auth = request.auth as AdminPrincipal;
          const params = request.params as { photoPostId: string };
          const body = request.body as {
            moderationStatus: any;
          };

          try {
            const photoPost = await moderatePhotoPost.execute({
              photoPostId: params.photoPostId,
              moderationStatus: body.moderationStatus,
              moderatedByAdminUserId: auth.adminUserId,
              requestId: request.correlationId,
            });

            const serialized = serializePhotoPost(photoPost);
            if (!serialized.mediaStorageKey) {
              return reply.code(200).send(serialized);
            }

            try {
              const mediaUrl = await photoStorageProvider.getSignedMediaUrl(
                serialized.mediaStorageKey,
              );
              return reply.code(200).send({
                ...serialized,
                mediaUrl,
              });
            } catch {
              return reply.code(200).send(serialized);
            }
          } catch (error) {
            if (error instanceof PhotoWallModerationError) {
              return sendPhotoWallError(error, reply);
            }

            throw error;
          }
        },
      });

      protectedRoutes.get("/audit-logs", {
        ...ADMIN_BACKOFFICE_ROUTE_ACCESS.listAuditLogs,
        preHandler: options.preHandler,
        schema: {
          tags: [...ADMIN_BACKOFFICE_HTTP_CONTRACT.tags],
          querystring: ADMIN_BACKOFFICE_HTTP_SCHEMAS.queries.auditLogList,
          response: {
            200: ADMIN_BACKOFFICE_HTTP_SCHEMAS.responses.auditLogList,
            401: errorResponseSchema,
            403: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const query = request.query as any;

          const result = await listAuditTrail.execute({
            page: query.page,
            pageSize: query.pageSize,
            actorType: query.actorType,
            entityType: query.entityType,
            actionType: query.actionType,
          });

          return reply.code(200).send({
            items: result.items.map(serializeAuditLog),
            page: result.page,
            pageSize: result.pageSize,
          });
        },
      });
    },
    {
      prefix: ADMIN_BACKOFFICE_HTTP_CONTRACT.routePrefix,
    },
  );
};
