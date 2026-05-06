import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";
import {
  adminRoute,
  errorResponseSchema,
  guestRoute,
  type GuestPrincipal,
  type HttpStatusError,
} from "../../shared/index.js";
import { PrismaAuditLogRepository, createAuditLogWriter } from "../../admin-backoffice/index.js";
import {
  createConfirmAttendanceUseCase,
  createDeclineAttendanceUseCase,
  createGetGuestInvitationOverviewUseCase,
  createListGuestEventsUseCase,
  GUESTS_RSVP_HTTP_CONTRACT,
  GUESTS_RSVP_HTTP_SCHEMAS,
  GuestsRsvpApplicationError,
  type Event,
  type EventGuestEligibility,
  type Guest,
  type GuestGroup,
  type GuestsRsvpEventListQueryDto,
  type GuestsRsvpSubmitRsvpRequestDto,
  PrismaEventGuestEligibilityRepository,
  PrismaEventRepository,
  PrismaGuestGroupRepository,
  PrismaGuestRepository,
  PrismaRsvpResponseRepository,
  PrismaRsvpResponseTransactionRunner,
} from "../index.js";

export const GUESTS_RSVP_ROUTE_ACCESS = {
  guestHome: guestRoute(),
  listEvents: guestRoute(),
  submitRsvp: guestRoute(),
  listAdminGuests: adminRoute(),
  listAdminRsvps: adminRoute(),
};

interface RegisterGuestsRsvpRoutesOptions {
  readonly preHandler?: preHandlerHookHandler;
}

function sendGuestsError(
  error: GuestsRsvpApplicationError,
  reply: any,
) {
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

function serializeEvent(event: Event) {
  return {
    ...event,
    startsAt: event.startsAt.toISOString(),
    location: {
      ...event.location,
    },
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function serializeEligibility(entry: EventGuestEligibility) {
  return {
    ...entry,
    createdAt: entry.createdAt.toISOString(),
  };
}

function serializeRsvpResponse(response: {
  id: string;
  eventId: string;
  guestId: string;
  responseStatus: string;
  companionsConfirmed: number;
  message: string | null;
  respondedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...response,
    respondedAt: response.respondedAt.toISOString(),
    createdAt: response.createdAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  };
}

export const registerGuestsRsvpRoutes: FastifyPluginAsync<RegisterGuestsRsvpRoutesOptions> =
  async (app, options) => {
    const guestRepository = new PrismaGuestRepository(
      app.prisma.guest as unknown as ConstructorParameters<typeof PrismaGuestRepository>[0],
    );
    const guestGroupRepository = new PrismaGuestGroupRepository(
      app.prisma.guestGroup as unknown as ConstructorParameters<typeof PrismaGuestGroupRepository>[0],
    );
    const eventRepository = new PrismaEventRepository(
      app.prisma.event as unknown as ConstructorParameters<typeof PrismaEventRepository>[0],
    );
    const eventGuestEligibilityRepository = new PrismaEventGuestEligibilityRepository(
      app.prisma.eventGuestEligibility as unknown as ConstructorParameters<
        typeof PrismaEventGuestEligibilityRepository
      >[0],
    );
    const rsvpResponseRepository = new PrismaRsvpResponseRepository(
      app.prisma.rsvpResponse as unknown as ConstructorParameters<typeof PrismaRsvpResponseRepository>[0],
    );
    const rsvpResponseTransactionRunner = new PrismaRsvpResponseTransactionRunner(app.prisma);
    const auditLogRepository = new PrismaAuditLogRepository(
      app.prisma.auditLog as unknown as ConstructorParameters<typeof PrismaAuditLogRepository>[0],
    );
    const auditLogWriter = createAuditLogWriter({
      auditLogRepository,
    });

    const getGuestInvitationOverview = createGetGuestInvitationOverviewUseCase({
      guestRepository,
      guestGroupRepository,
      eventRepository,
      eventGuestEligibilityRepository,
      rsvpResponseRepository,
    });
    const listGuestEvents = createListGuestEventsUseCase({
      guestRepository,
      eventRepository,
      eventGuestEligibilityRepository,
    });
    const confirmAttendance = createConfirmAttendanceUseCase({
      guestRepository,
      guestGroupRepository,
      eventRepository,
      eventGuestEligibilityRepository,
      rsvpResponseTransactionRunner,
      auditLogWriter,
    });
    const declineAttendance = createDeclineAttendanceUseCase({
      guestRepository,
      guestGroupRepository,
      eventRepository,
      eventGuestEligibilityRepository,
      rsvpResponseTransactionRunner,
      auditLogWriter,
    });

    await app.register(async (guestRoutes) => {
      guestRoutes.setErrorHandler((error, _request, reply) => {
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

      guestRoutes.get("/guest/home", {
        ...GUESTS_RSVP_ROUTE_ACCESS.guestHome,
        preHandler: options.preHandler,
        schema: {
          tags: [...GUESTS_RSVP_HTTP_CONTRACT.tags],
          response: {
            200: GUESTS_RSVP_HTTP_SCHEMAS.responses.guestHome,
            403: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const auth = request.auth as GuestPrincipal;

          try {
            const overview = await getGuestInvitationOverview.execute({
              guestId: auth.guestId,
            });

            return reply.code(200).send({
              guestGroup: serializeGuestGroup(overview.guestGroup),
              guests: overview.guests.map(serializeGuest),
              events: overview.events.map(serializeEvent),
              eligibility: overview.eligibility.map(serializeEligibility),
              responses: overview.responses.map(serializeRsvpResponse),
            });
          } catch (error) {
            if (error instanceof GuestsRsvpApplicationError) {
              return sendGuestsError(error, reply);
            }

            throw error;
          }
        },
      });

      guestRoutes.get("/events", {
        ...GUESTS_RSVP_ROUTE_ACCESS.listEvents,
        preHandler: options.preHandler,
        schema: {
          tags: [...GUESTS_RSVP_HTTP_CONTRACT.tags],
          querystring: GUESTS_RSVP_HTTP_SCHEMAS.queries.eventList,
          response: {
            200: GUESTS_RSVP_HTTP_SCHEMAS.responses.eventList,
            403: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const auth = request.auth as GuestPrincipal;
          const query = request.query as GuestsRsvpEventListQueryDto;

          try {
            const result = await listGuestEvents.execute({
              guestId: auth.guestId,
              eventType: query.eventType,
              page: query.page,
              pageSize: query.pageSize,
            });

            return reply.code(200).send({
              items: result.items.map(serializeEvent),
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

      guestRoutes.post("/rsvp/respond", {
        ...GUESTS_RSVP_ROUTE_ACCESS.submitRsvp,
        preHandler: options.preHandler,
        schema: {
          tags: [...GUESTS_RSVP_HTTP_CONTRACT.tags],
          body: GUESTS_RSVP_HTTP_SCHEMAS.bodies.submitRsvp,
          response: {
            200: GUESTS_RSVP_HTTP_SCHEMAS.responses.submitRsvp,
            400: errorResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
        handler: async (request, reply) => {
          const auth = request.auth as GuestPrincipal;
          const body = request.body as GuestsRsvpSubmitRsvpRequestDto;

          try {
            const result =
              body.responseStatus === "no"
                ? await declineAttendance.execute({
                    eventId: body.eventId,
                    guestId: auth.guestId,
                    message: body.message,
                    requestId: request.correlationId,
                  })
                : await confirmAttendance.execute({
                    eventId: body.eventId,
                    guestId: auth.guestId,
                    responseStatus: body.responseStatus,
                    companionsConfirmed: body.companionsConfirmed,
                    message: body.message,
                    requestId: request.correlationId,
                  });

            return reply.code(200).send({
              persistedResponse: serializeRsvpResponse(result.persistedResponse),
              outcome: result.outcome,
            });
          } catch (error) {
            if (error instanceof GuestsRsvpApplicationError) {
              return sendGuestsError(error, reply);
            }

            throw error;
          }
        },
      });
    }, {
      prefix: GUESTS_RSVP_HTTP_CONTRACT.routePrefix,
    });
  };
