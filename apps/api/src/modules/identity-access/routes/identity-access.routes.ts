import type { FastifyPluginAsync } from "fastify";
import { createAuditLogWriter, PrismaAuditLogRepository } from "../../admin-backoffice/index.js";
import { errorResponseSchema, publicRoute } from "../../shared/index.js";
import {
  createIssueGuestSessionUseCase,
  createLoginGuestWithInviteTokenUseCase,
  createLoginGuestWithShortCodeUseCase,
  GuestInviteTokenAuthenticationError,
  IDENTITY_ACCESS_HTTP_CONTRACT,
  IDENTITY_ACCESS_HTTP_SCHEMAS,
  type IdentityAccessGuestCodeLoginRequestDto,
  type IdentityAccessGuestTokenLoginRequestDto,
  PrismaGuestRepository,
  PrismaInviteTokenConsumptionTransactionRunner,
  PrismaInviteTokenRepository,
} from "../index.js";

export const IDENTITY_ACCESS_ROUTE_ACCESS = {
  requestGuestAccess: publicRoute(),
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

export const registerIdentityAccessRoutes: FastifyPluginAsync = async (app) => {
  const inviteTokenRepository = new PrismaInviteTokenRepository(
    app.prisma.inviteToken as unknown as ConstructorParameters<typeof PrismaInviteTokenRepository>[0],
  );
  const guestRepository = new PrismaGuestRepository(
    app.prisma.guest as unknown as ConstructorParameters<typeof PrismaGuestRepository>[0],
  );
  const inviteTokenConsumptionTransactionRunner =
    new PrismaInviteTokenConsumptionTransactionRunner(app.prisma);
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
  const issueGuestSession = createIssueGuestSessionUseCase({
    guestSessionIssuer: app.guestSessionService,
    env: { NODE_ENV: process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV === "development" ? "development" : "test" },
  });

  await app.register(async (protectedRoutes) => {
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
  }, {
    prefix: IDENTITY_ACCESS_HTTP_CONTRACT.routePrefix,
  });
};
