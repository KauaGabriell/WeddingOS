import type { FastifyPluginAsync } from "fastify";
import { createAuditLogWriter, PrismaAuditLogRepository } from "../../admin-backoffice/index.js";
import {
  PrismaEventGuestEligibilityRepository,
  PrismaEventRepository,
  PrismaGuestGroupRepository,
} from "../../guests-rsvp/index.js";
import { errorResponseSchema, publicRoute } from "../../shared/index.js";
import {
  createRequestAdminMagicLinkUseCase,
  createIssueGuestSessionUseCase,
  createLoginGuestWithInviteTokenUseCase,
  createLoginGuestWithShortCodeUseCase,
  createRegisterOpenGuestAccessUseCase,
  GuestInviteTokenAuthenticationError,
  IDENTITY_ACCESS_HTTP_CONTRACT,
  IDENTITY_ACCESS_HTTP_SCHEMAS,
  LoggerAdminMagicLinkDispatcher,
  OpenGuestAccessRegistrationError,
  PrismaOpenGuestAccessRegistrationTransactionRunner,
  PrismaAdminUserRepository,
  type IdentityAccessGuestCodeLoginRequestDto,
  type IdentityAccessAdminLoginRequestDto,
  type IdentityAccessRegisterOpenGuestAccessRequestDto,
  type IdentityAccessGuestTokenLoginRequestDto,
  PrismaGuestRepository,
  PrismaInviteTokenConsumptionTransactionRunner,
  PrismaInviteTokenRepository,
} from "../index.js";

export const IDENTITY_ACCESS_ROUTE_ACCESS = {
  requestGuestAccess: publicRoute(),
  registerOpenGuestAccess: publicRoute(),
  loginWithInviteToken: publicRoute(),
  loginWithShortCode: publicRoute(),
  adminLogin: publicRoute(),
};

function buildSetCookieHeader(input: {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: "/";
  maxAge: number;
  expires: Date;
}): string {
  const parts = [
    `${input.name}=${encodeURIComponent(input.value)}`,
    `Max-Age=${input.maxAge}`,
    `Expires=${input.expires.toUTCString()}`,
    `Path=${input.path}`,
    `SameSite=${input.sameSite}`,
  ];

  if (input.httpOnly) {
    parts.push("HttpOnly");
  }

  if (input.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function sendUnauthorized(reply: any) {
  return reply.code(401).send({
    code: "GUEST_AUTHENTICATION_FAILED",
    message: "Invalid guest credentials",
  });
}

function serializeGuest(guest: {
  id: string;
  guestGroupId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  status: string;
  lastAccessAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...guest,
    lastAccessAt: guest.lastAccessAt?.toISOString() ?? null,
    createdAt: guest.createdAt.toISOString(),
    updatedAt: guest.updatedAt.toISOString(),
  };
}

function serializeGuestGroup(guestGroup: {
  id: string;
  displayName: string;
  groupCode: string;
  allowedCompanions: number;
  primaryContactName: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...guestGroup,
    createdAt: guestGroup.createdAt.toISOString(),
    updatedAt: guestGroup.updatedAt.toISOString(),
  };
}

export const registerIdentityAccessRoutes: FastifyPluginAsync = async (app) => {
  const inviteTokenRepository = new PrismaInviteTokenRepository(
    app.prisma.inviteToken as unknown as ConstructorParameters<typeof PrismaInviteTokenRepository>[0],
  );
  const adminUserRepository = new PrismaAdminUserRepository(
    app.prisma.adminUser as unknown as ConstructorParameters<typeof PrismaAdminUserRepository>[0],
  );
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
  const inviteTokenConsumptionTransactionRunner =
    new PrismaInviteTokenConsumptionTransactionRunner(app.prisma);
  const openGuestAccessRegistrationTransactionRunner =
    new PrismaOpenGuestAccessRegistrationTransactionRunner(app.prisma);
  const auditLogWriter = createAuditLogWriter({
    auditLogRepository: new PrismaAuditLogRepository(
      app.prisma.auditLog as unknown as ConstructorParameters<typeof PrismaAuditLogRepository>[0],
    ),
  });

  const loginGuestWithInviteToken = createLoginGuestWithInviteTokenUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner,
    auditLogWriter,
  });
  const loginGuestWithShortCode = createLoginGuestWithShortCodeUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner,
    auditLogWriter,
  });
  const registerOpenGuestAccess = createRegisterOpenGuestAccessUseCase({
    guestRepository,
    guestGroupRepository,
    inviteTokenRepository,
    eventRepository,
    registrationTransactionRunner: openGuestAccessRegistrationTransactionRunner,
    auditLogWriter,
  });
  const requestAdminMagicLink = createRequestAdminMagicLinkUseCase({
    adminUserRepository,
    adminMagicLinkIssuer: app.adminMagicLinkService,
    adminMagicLinkDispatcher: new LoggerAdminMagicLinkDispatcher(app.log, {
      includeTokenInLogs: process.env.NODE_ENV !== "production",
    }),
  });
  const issueGuestSession = createIssueGuestSessionUseCase({
    guestSessionIssuer: app.guestSessionService,
    env: { NODE_ENV: process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV === "development" ? "development" : "test" },
  });

  await app.register(async (protectedRoutes) => {
    protectedRoutes.post("/guest/register-open-access", {
      ...IDENTITY_ACCESS_ROUTE_ACCESS.registerOpenGuestAccess,
      schema: {
        tags: [...IDENTITY_ACCESS_HTTP_CONTRACT.tags],
        body: IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.registerOpenGuestAccess,
        response: {
          200: IDENTITY_ACCESS_HTTP_SCHEMAS.responses.openGuestAccessRegistration,
          400: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const body = request.body as IdentityAccessRegisterOpenGuestAccessRequestDto;

        try {
          const registrationResult = await registerOpenGuestAccess.execute({
            fullName: body.fullName,
            phone: body.phone,
            companionsCount: body.companionsCount,
            companionNames: body.companionNames,
            requestId: request.correlationId,
          });
          const session = await issueGuestSession.execute({
            authenticationResult: registrationResult.authenticationResult,
          });

          reply.header(
            "set-cookie",
            buildSetCookieHeader({
              ...session.cookie,
              value: session.accessToken,
            }),
          );

          return reply.code(200).send({
            authSession: {
              actorType: session.actorType,
              actorId: session.actorId,
              accessToken: session.accessToken,
              refreshToken: null,
              expiresAt: session.expiresAt.toISOString(),
            },
            guest: serializeGuest(registrationResult.guest),
            guestGroup: serializeGuestGroup(registrationResult.guestGroup),
            companions: registrationResult.companions.map(serializeGuest),
            shortCode: registrationResult.shortCode,
            message: registrationResult.message,
          });
        } catch (error) {
          if (error instanceof OpenGuestAccessRegistrationError) {
            const codeByReason: Record<OpenGuestAccessRegistrationError["reason"], string> = {
              phone_already_registered: "PHONE_ALREADY_REGISTERED",
              invalid_companions_payload: "INVALID_COMPANIONS_PAYLOAD",
              invalid_phone: "INVALID_PHONE",
              invalid_full_name: "INVALID_FULL_NAME",
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

    protectedRoutes.post("/guest/login/token", {
      ...IDENTITY_ACCESS_ROUTE_ACCESS.loginWithInviteToken,
      schema: {
        tags: [...IDENTITY_ACCESS_HTTP_CONTRACT.tags],
        body: IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.guestTokenLogin,
        response: {
          200: IDENTITY_ACCESS_HTTP_SCHEMAS.responses.authSession,
          401: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const body = request.body as IdentityAccessGuestTokenLoginRequestDto;

        try {
          const authenticationResult = await loginGuestWithInviteToken.execute({
            token: body.token,
            requestId: request.correlationId,
          });
          const session = await issueGuestSession.execute({
            authenticationResult,
          });

          reply.header(
            "set-cookie",
            buildSetCookieHeader({
              ...session.cookie,
              value: session.accessToken,
            }),
          );

          return reply.code(200).send({
            actorType: session.actorType,
            actorId: session.actorId,
            accessToken: session.accessToken,
            refreshToken: null,
            expiresAt: session.expiresAt.toISOString(),
          });
        } catch (error) {
          if (error instanceof GuestInviteTokenAuthenticationError) {
            return sendUnauthorized(reply);
          }

          throw error;
        }
      },
    });

    protectedRoutes.post("/guest/login/code", {
      ...IDENTITY_ACCESS_ROUTE_ACCESS.loginWithShortCode,
      schema: {
        tags: [...IDENTITY_ACCESS_HTTP_CONTRACT.tags],
        body: IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.guestCodeLogin,
        response: {
          200: IDENTITY_ACCESS_HTTP_SCHEMAS.responses.authSession,
          401: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const body = request.body as IdentityAccessGuestCodeLoginRequestDto;

        try {
          const authenticationResult = await loginGuestWithShortCode.execute({
            code: body.code,
            requestId: request.correlationId,
          });
          const session = await issueGuestSession.execute({
            authenticationResult,
          });

          reply.header(
            "set-cookie",
            buildSetCookieHeader({
              ...session.cookie,
              value: session.accessToken,
            }),
          );

          return reply.code(200).send({
            actorType: session.actorType,
            actorId: session.actorId,
            accessToken: session.accessToken,
            refreshToken: null,
            expiresAt: session.expiresAt.toISOString(),
          });
        } catch (error) {
          if (error instanceof GuestInviteTokenAuthenticationError) {
            return sendUnauthorized(reply);
          }

          throw error;
        }
      },
    });

    protectedRoutes.post("/admin/login", {
      ...IDENTITY_ACCESS_ROUTE_ACCESS.adminLogin,
      schema: {
        tags: [...IDENTITY_ACCESS_HTTP_CONTRACT.tags],
        body: IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.adminLogin,
        response: {
          200: IDENTITY_ACCESS_HTTP_SCHEMAS.responses.requestAccepted,
        },
      },
      handler: async (request, reply) => {
        const body = request.body as IdentityAccessAdminLoginRequestDto;
        const result = await requestAdminMagicLink.execute({
          email: body.email,
          requestId: request.correlationId,
        });

        return reply.code(200).send(result);
      },
    });
  }, {
    prefix: IDENTITY_ACCESS_HTTP_CONTRACT.routePrefix,
  });
};
