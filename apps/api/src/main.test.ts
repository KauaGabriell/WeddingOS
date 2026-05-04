import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import type { FastifyRequest } from "fastify";
import type {
  AdminUser as PrismaAdminUserRecord,
  Event as PrismaEventRecord,
  Guest as PrismaGuestRecord,
  GuestGroup as PrismaGuestGroupRecord,
  InviteToken as PrismaInviteTokenRecord,
} from "./generated/prisma/client.js";
import { type AppEnv, buildApp } from "./main.js";
import {
  ADMIN_BACKOFFICE_HTTP_CONTRACT,
  ADMIN_BACKOFFICE_INFRASTRUCTURE_PORTS,
  ADMIN_BACKOFFICE_MODULE_USE_CASES,
  ADMIN_BACKOFFICE_ROUTE_ACCESS,
} from "./modules/admin-backoffice/index.js";
import type { AuditLog } from "./modules/admin-backoffice/index.js";
import {
  GIFT_REGISTRY_HTTP_CONTRACT,
  GIFT_REGISTRY_INFRASTRUCTURE_PORTS,
  GIFT_REGISTRY_MODULE_USE_CASES,
  GIFT_REGISTRY_ROUTE_ACCESS,
  GIFT_REGISTRY_TRANSACTIONAL_CONTRACTS,
  GiftReservationConflictError,
} from "./modules/gift-registry/index.js";
import type { Gift, GiftReservation } from "./modules/gift-registry/index.js";
import type {
  Event,
  EventGuestEligibility,
  Guest,
  GuestGroup,
  RsvpResponse,
} from "./modules/guests-rsvp/index.js";
import {
  GUESTS_RSVP_HTTP_CONTRACT,
  GUESTS_RSVP_IDEMPOTENCY_CONTRACTS,
  GUESTS_RSVP_INFRASTRUCTURE_PORTS,
  GUESTS_RSVP_MODULE_USE_CASES,
  GUESTS_RSVP_ROUTE_ACCESS,
  PrismaEventRepository,
  PrismaGuestGroupRepository,
  PrismaGuestRepository as PrismaGuestsRsvpGuestRepository,
  buildRsvpResponseIdempotencyKey,
} from "./modules/guests-rsvp/index.js";
import {
  assertInviteTokenIsUsable,
  buildGuestSessionCookieAttributes,
  canConsumeInviteToken,
  consumeInviteToken,
  createRequestAdminMagicLinkUseCase,
  createRevokeInviteTokenUseCase,
  createIssueGuestSessionUseCase,
  createLoginGuestWithInviteTokenUseCase,
  createLoginGuestWithShortCodeUseCase,
  createAdminAuthGuard,
  createGuestAuthGuard,
  GuestInviteTokenAuthenticationError,
  type AdminMagicLinkIssueInput,
  type AdminMagicLinkIssueResult,
  type SessionVerificationInput,
  type GuestSessionVerifier,
  IDENTITY_ACCESS_HTTP_CONTRACT,
  IDENTITY_ACCESS_HTTP_SCHEMAS,
  IDENTITY_ACCESS_INFRASTRUCTURE_PORTS,
  IDENTITY_ACCESS_INVITE_TOKEN_LIFECYCLE_CONTRACTS,
  IDENTITY_ACCESS_MODULE_USE_CASES,
  IDENTITY_ACCESS_ROUTE_ACCESS,
  InvalidInviteTokenConsumptionError,
  InviteTokenRevocationError,
  InviteTokenValidationError,
  PrismaAdminUserRepository,
  PrismaGuestRepository,
  PrismaInviteTokenConsumptionTransactionRunner,
  PrismaInviteTokenRepository,
  resolveInviteTokenLifecycleStatus,
  revokeInviteToken,
  SignedAdminMagicLinkService,
  SignedAdminSessionService,
  SignedGuestSessionService,
  validateInviteToken,
} from "./modules/identity-access/index.js";
import type {
  AdminUser,
  Guest as IdentityAccessGuest,
  InviteToken,
} from "./modules/identity-access/index.js";
import { MODULE_NAMES } from "./modules/index.js";
import {
  PHOTO_WALL_HTTP_CONTRACT,
  PHOTO_WALL_INFRASTRUCTURE_PORTS,
  PHOTO_WALL_MODULE_USE_CASES,
  PHOTO_WALL_ROUTE_ACCESS,
} from "./modules/photo-wall/index.js";
import type { PhotoPost } from "./modules/photo-wall/index.js";
import {
  allowPublicAccess,
  canAccessGuestResource,
  hasAdminRole,
  type HttpStatusError,
  resolveBearerToken,
  type AdminPrincipal,
  type GuestPrincipal,
} from "./modules/shared/index.js";
import { REQUEST_ID_HEADER } from "./modules/shared/platform/logging/create-api-logger.js";

function createTestEnv(): AppEnv {
  return {
    NODE_ENV: "test",
    API_HOST: "127.0.0.1",
    API_PORT: 3001,
    CORS_ORIGIN: "http://localhost:3000",
    S3_ENDPOINT: "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: "weddingos-photos",
    S3_ACCESS_KEY_ID: "minioadmin",
    S3_SECRET_ACCESS_KEY: "super-secret-storage-key",
    S3_FORCE_PATH_STYLE: true,
    S3_SIGNED_URL_EXPIRES_IN_SECONDS: 900,
    JWT_SECRET: "12345678901234567890123456789012",
    corsOrigins: ["http://localhost:3000"],
  };
}

async function testEchoesIncomingRequestId(): Promise<void> {
  const app = await buildApp(createTestEnv());

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        [REQUEST_ID_HEADER]: "req-from-client",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers[REQUEST_ID_HEADER], "req-from-client");
  } finally {
    await app.close();
  }
}

async function testGeneratesRequestIdWhenMissing(): Promise<void> {
  const app = await buildApp(createTestEnv());

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    assert.equal(response.statusCode, 200);
    assert.match(
      String(response.headers[REQUEST_ID_HEADER]),
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  } finally {
    await app.close();
  }
}

async function testLogsIncludeRequestIdWithoutSensitiveHeaders(): Promise<void> {
  const logStream = new PassThrough();
  const logChunks: string[] = [];

  logStream.on("data", (chunk: Buffer | string) => {
    logChunks.push(chunk.toString());
  });

  const app = await buildApp(createTestEnv(), {
    loggerStream: logStream,
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        [REQUEST_ID_HEADER]: "secure-request-id",
        authorization: "Bearer top-secret-token",
        cookie: "session=top-secret-cookie",
      },
    });

    assert.equal(response.statusCode, 200);

    await new Promise<void>((resolve) => {
      logStream.end(resolve);
    });

    const serializedLogs = logChunks.join("");

    assert.match(serializedLogs, /"requestId":"secure-request-id"/);
    assert.match(serializedLogs, /request completed/);
    assert.doesNotMatch(serializedLogs, /top-secret-token/);
    assert.doesNotMatch(serializedLogs, /top-secret-cookie/);
  } finally {
    await app.close();
  }
}

async function testBuildAppKeepsModuleRegistryConnected(): Promise<void> {
  const app = await buildApp(createTestEnv());

  try {
    await app.ready();
    assert.equal(MODULE_NAMES.length, 5);
  } finally {
    await app.close();
  }
}

async function testDomainEntitiesAreExportedByModuleBarrels(): Promise<void> {
  const adminUser: AdminUser = {
    id: "admin-1",
    name: "Admin",
    email: "admin@example.com",
    authProvider: "email_magic_link",
    role: "super_admin",
    status: "active",
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const inviteToken: InviteToken = {
    id: "invite-1",
    guestGroupId: "group-1",
    guestId: null,
    tokenHash: "hash",
    shortCode: "ABC123",
    channel: "manual",
    status: "issued",
    issuedAt: new Date(),
    expiresAt: new Date(),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const guestGroup: GuestGroup = {
    id: "group-1",
    displayName: "Familia Silva",
    groupCode: "SILVA",
    allowedCompanions: 2,
    primaryContactName: "Joao",
    primaryContactPhone: null,
    primaryContactEmail: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const guest: Guest = {
    id: "guest-1",
    guestGroupId: "group-1",
    fullName: "Joao Silva",
    phone: null,
    email: "joao@example.com",
    isPrimary: true,
    status: "active",
    lastAccessAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const event: Event = {
    id: "event-1",
    slug: "casamento",
    name: "Casamento",
    eventType: "wedding",
    startsAt: new Date(),
    location: {
      venueName: "Igreja",
      addressLine: "Rua A",
      addressNumber: "100",
      neighborhood: null,
      city: "Sao Paulo",
      state: "SP",
      postalCode: null,
      latitude: null,
      longitude: null,
      mapUrl: null,
    },
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const eligibility: EventGuestEligibility = {
    id: "eligibility-1",
    eventId: "event-1",
    guestId: "guest-1",
    canRsvp: true,
    createdAt: new Date(),
  };

  const rsvpResponse: RsvpResponse = {
    id: "rsvp-1",
    eventId: "event-1",
    guestId: "guest-1",
    responseStatus: "yes",
    companionsConfirmed: 1,
    message: null,
    respondedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const gift: Gift = {
    id: "gift-1",
    name: "Jogo de panelas",
    category: "cozinha",
    description: null,
    estimatedValue: 199.9,
    imageUrl: null,
    displayOrder: 1,
    status: "available",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const giftReservation: GiftReservation = {
    id: "reservation-1",
    giftId: "gift-1",
    guestId: "guest-1",
    reservationStatus: "active",
    purchaseNotes: null,
    reservedAt: new Date(),
    releasedAt: null,
    releasedByAdminUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const photoPost: PhotoPost = {
    id: "post-1",
    guestId: "guest-1",
    authorName: "Joao",
    message: "Parabens",
    mediaStorageKey: "photos/post-1.jpg",
    mediaUrl: null,
    mediaMimeType: "image/jpeg",
    mediaSizeBytes: 1024,
    mediaWidth: null,
    mediaHeight: null,
    moderationStatus: "pending",
    submittedAt: new Date(),
    approvedAt: null,
    hiddenAt: null,
    moderatedByAdminUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const auditLog: AuditLog = {
    id: "audit-1",
    entityType: "gift_reservation",
    entityId: "reservation-1",
    actionType: "GIFT_RESERVED",
    actorAdminUserId: null,
    actorGuestId: "guest-1",
    actorType: "guest",
    requestId: "request-1",
    metadata: { giftId: "gift-1" },
    createdAt: new Date(),
  };

  assert.equal(adminUser.status, "active");
  assert.equal(inviteToken.status, "issued");
  assert.equal(guestGroup.allowedCompanions, 2);
  assert.equal(guest.status, "active");
  assert.equal(event.eventType, "wedding");
  assert.equal(eligibility.canRsvp, true);
  assert.equal(rsvpResponse.responseStatus, "yes");
  assert.equal(gift.status, "available");
  assert.equal(giftReservation.reservationStatus, "active");
  assert.equal(photoPost.moderationStatus, "pending");
  assert.equal(auditLog.actorType, "guest");
}

function testModuleLayerContractsAreExported(): void {
  assert.equal(IDENTITY_ACCESS_HTTP_CONTRACT.routePrefix, "/identity");
  assert.equal(GUESTS_RSVP_HTTP_CONTRACT.routePrefix, "/guests");
  assert.equal(GIFT_REGISTRY_HTTP_CONTRACT.routePrefix, "/gifts");
  assert.equal(PHOTO_WALL_HTTP_CONTRACT.routePrefix, "/photos");
  assert.equal(ADMIN_BACKOFFICE_HTTP_CONTRACT.routePrefix, "/admin");

  assert.equal(IDENTITY_ACCESS_MODULE_USE_CASES.guestAuthentication, "implemented");
  assert.equal(IDENTITY_ACCESS_MODULE_USE_CASES.adminAuthentication, "implemented");
  assert.equal(IDENTITY_ACCESS_MODULE_USE_CASES.inviteTokenLifecycle, "implemented");
  assert.equal(GUESTS_RSVP_MODULE_USE_CASES.rsvpSubmission, "planned");
  assert.equal(GIFT_REGISTRY_MODULE_USE_CASES.giftReservationLifecycle, "planned");
  assert.equal(PHOTO_WALL_MODULE_USE_CASES.photoSubmission, "planned");
  assert.equal(ADMIN_BACKOFFICE_MODULE_USE_CASES.auditTrailQuery, "planned");

  assert.equal(
    IDENTITY_ACCESS_INFRASTRUCTURE_PORTS.repositories.includes("invite-token-repository"),
    true,
  );
  assert.equal(
    IDENTITY_ACCESS_INFRASTRUCTURE_PORTS.repositories.includes("guest-repository"),
    true,
  );
  assert.equal(
    IDENTITY_ACCESS_INFRASTRUCTURE_PORTS.providers.includes(
      "invite-token-consumption-transaction-runner",
    ),
    true,
  );
  assert.equal(
    IDENTITY_ACCESS_INFRASTRUCTURE_PORTS.providers.includes("guest-session-issuer"),
    true,
  );
  assert.equal(
    IDENTITY_ACCESS_INFRASTRUCTURE_PORTS.providers.includes("admin-magic-link-issuer"),
    true,
  );
  assert.equal(
    IDENTITY_ACCESS_INFRASTRUCTURE_PORTS.providers.includes("admin-magic-link-dispatcher"),
    true,
  );
  assert.equal(
    IDENTITY_ACCESS_INFRASTRUCTURE_PORTS.providers.includes("admin-session-issuer"),
    true,
  );
  assert.equal(
    GUESTS_RSVP_INFRASTRUCTURE_PORTS.repositories.includes("rsvp-response-repository"),
    true,
  );
  assert.equal(
    GUESTS_RSVP_INFRASTRUCTURE_PORTS.providers.includes("rsvp-response-transaction-runner"),
    true,
  );
  assert.equal(
    GIFT_REGISTRY_INFRASTRUCTURE_PORTS.providers.includes("payment-proof-storage-provider"),
    true,
  );
  assert.equal(
    GIFT_REGISTRY_INFRASTRUCTURE_PORTS.providers.includes(
      "gift-reservation-transaction-runner",
    ),
    true,
  );
  assert.equal(PHOTO_WALL_INFRASTRUCTURE_PORTS.providers.includes("photo-storage-provider"), true);
  assert.equal(
    ADMIN_BACKOFFICE_INFRASTRUCTURE_PORTS.repositories.includes("audit-log-repository"),
    true,
  );
  assert.equal(IDENTITY_ACCESS_ROUTE_ACCESS.loginWithInviteToken.config.access, "public");
  assert.equal(IDENTITY_ACCESS_INVITE_TOKEN_LIFECYCLE_CONTRACTS.usagePolicy, "single-use");
  assert.equal(
    IDENTITY_ACCESS_INVITE_TOKEN_LIFECYCLE_CONTRACTS.expirationModel,
    "derived-from-expiresAt",
  );
  assert.deepEqual(IDENTITY_ACCESS_INVITE_TOKEN_LIFECYCLE_CONTRACTS.persistenceTransitions, [
    "mark-as-used",
    "revoke",
  ]);
  assert.equal(GUESTS_RSVP_ROUTE_ACCESS.guestHome.config.access, "guest");
  assert.equal(GUESTS_RSVP_IDEMPOTENCY_CONTRACTS.idempotencyKey, "eventId+guestId");
  assert.deepEqual(
    IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.adminLogin.parse({
      email: "admin@example.com",
      password: "ignored-by-schema",
    }),
    {
      email: "admin@example.com",
    },
  );
  assert.deepEqual(IDENTITY_ACCESS_HTTP_SCHEMAS.responses.requestAccepted.parse({ accepted: true }), {
    accepted: true,
  });
  assert.equal(GUESTS_RSVP_IDEMPOTENCY_CONTRACTS.persistenceStrategy, "single-row-upsert");
  assert.equal(
    GUESTS_RSVP_IDEMPOTENCY_CONTRACTS.replayBehavior,
    "return-existing-response-without-duplicate-row",
  );
  assert.equal(GIFT_REGISTRY_ROUTE_ACCESS.reserveGift.config.access, "guest");
  assert.equal(PHOTO_WALL_ROUTE_ACCESS.createPhotoPost.config.access, "guest");
  assert.equal(ADMIN_BACKOFFICE_ROUTE_ACCESS.dashboard.config.access, "admin");
  assert.equal(GIFT_REGISTRY_TRANSACTIONAL_CONTRACTS.reserveAvailableGift, "transactional");
  assert.equal(
    GIFT_REGISTRY_TRANSACTIONAL_CONTRACTS.activeReservationUniqueness,
    "database-partial-unique-index",
  );
  assert.equal(GIFT_REGISTRY_TRANSACTIONAL_CONTRACTS.conflictStatusCode, 409);
}

function createAuthRequest(authorization?: string): FastifyRequest {
  return {
    headers: authorization ? { authorization } : {},
    id: "req-auth-1",
    correlationId: "req-auth-1",
    auth: undefined,
  } as FastifyRequest;
}

async function testBearerTokenResolution(): Promise<void> {
  assert.equal(resolveBearerToken(createAuthRequest("Bearer guest-token")), "guest-token");
  assert.throws(() => resolveBearerToken(createAuthRequest()), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 401;
  });
  assert.throws(() => resolveBearerToken(createAuthRequest("Token guest-token")), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 401;
  });
}

async function testAuthGuardsSeparateGuestAndAdmin(): Promise<void> {
  const guestPrincipal: GuestPrincipal = {
    actorType: "guest",
    guestId: "guest-1",
    guestGroupId: "group-1",
  };
  const adminPrincipal: AdminPrincipal = {
    actorType: "admin",
    adminUserId: "admin-1",
    role: "super_admin",
  };

  const guestVerifier = {
    async verifySession({ token }: SessionVerificationInput) {
      if (token === "guest-token") {
        return guestPrincipal;
      }

      if (token === "admin-token") {
        return adminPrincipal;
      }

      return null;
    },
  };
  const adminVerifier = {
    async verifySession({ token }: SessionVerificationInput) {
      if (token === "guest-token") {
        return guestPrincipal;
      }

      if (token === "admin-token") {
        return adminPrincipal;
      }

      return null;
    },
  };

  const guestGuard = createGuestAuthGuard(guestVerifier as GuestSessionVerifier);
  const adminGuard = createAdminAuthGuard(adminVerifier);

  const guestRequest = createAuthRequest("Bearer guest-token");
  const resolvedGuest = await guestGuard(guestRequest);

  assert.deepEqual(resolvedGuest, guestPrincipal);
  assert.deepEqual(guestRequest.auth, guestPrincipal);

  await assert.rejects(() => guestGuard(createAuthRequest("Bearer invalid-token")), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 401;
  });
  await assert.rejects(() => adminGuard(createAuthRequest("Bearer guest-token")), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 403;
  });
  await assert.rejects(() => guestGuard(createAuthRequest("Bearer admin-token")), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 403;
  });
}

async function testAccessPolicies(): Promise<void> {
  const guestPrincipal: GuestPrincipal = {
    actorType: "guest",
    guestId: "guest-1",
    guestGroupId: "group-1",
  };
  const adminPrincipal: AdminPrincipal = {
    actorType: "admin",
    adminUserId: "admin-1",
    role: "super_admin",
  };
  const editorPrincipal: AdminPrincipal = {
    actorType: "admin",
    adminUserId: "admin-2",
    role: "editor",
  };

  assert.equal(canAccessGuestResource(guestPrincipal, { guestId: "guest-1" }), true);
  assert.equal(canAccessGuestResource(guestPrincipal, { guestGroupId: "group-1" }), true);
  assert.equal(canAccessGuestResource(guestPrincipal, { guestId: "guest-2" }), false);
  assert.equal(hasAdminRole(adminPrincipal, ["super_admin"]), true);
  assert.equal(hasAdminRole(editorPrincipal, ["super_admin"]), false);

  const publicRequest = createAuthRequest();
  await allowPublicAccess(publicRequest);
  assert.equal(publicRequest.auth, undefined);
}

function testGiftReservationConflictError(): void {
  const error = new GiftReservationConflictError("gift-1");

  assert.equal(error.name, "GiftReservationConflictError");
  assert.equal(error.giftId, "gift-1");
  assert.equal(error.statusCode, 409);
}

function testRsvpIdempotencyKeyBuilder(): void {
  assert.deepEqual(
    buildRsvpResponseIdempotencyKey({
      eventId: "event-1",
      guestId: "guest-1",
    }),
    {
      eventId: "event-1",
      guestId: "guest-1",
    },
  );
}

function testInviteTokenLifecyclePolicies(): void {
  const now = new Date("2026-04-30T12:00:00.000Z");
  const baseToken: InviteToken = {
    id: "invite-1",
    guestGroupId: "group-1",
    guestId: null,
    tokenHash: "hash",
    shortCode: "ABC123",
    channel: "manual",
    status: "issued",
    issuedAt: new Date("2026-04-25T12:00:00.000Z"),
    expiresAt: new Date("2026-05-01T12:00:00.000Z"),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  assert.equal(resolveInviteTokenLifecycleStatus(baseToken, now), "issued");
  assert.equal(canConsumeInviteToken(baseToken, now), true);

  const expiredToken: InviteToken = {
    ...baseToken,
    expiresAt: new Date("2026-04-29T12:00:00.000Z"),
  };
  assert.equal(resolveInviteTokenLifecycleStatus(expiredToken, now), "expired");
  assert.equal(canConsumeInviteToken(expiredToken, now), false);

  const usedToken = consumeInviteToken(baseToken, { consumedAt: now });
  assert.equal(resolveInviteTokenLifecycleStatus(usedToken, now), "used");
  assert.equal(usedToken.status, "used");
  assert.equal(usedToken.usedAt?.toISOString(), now.toISOString());

  const revokedToken = revokeInviteToken(baseToken, {
    reason: "guest requested reset",
    revokedAt: now,
  });
  assert.equal(resolveInviteTokenLifecycleStatus(revokedToken, now), "revoked");
  assert.equal(revokedToken.revokedReason, "guest requested reset");
  assert.equal(revokedToken.revokedAt?.toISOString(), now.toISOString());

  const revokedAfterUse: InviteToken = {
    ...usedToken,
    status: "revoked",
    revokedAt: now,
    revokedReason: "manual block",
  };
  assert.equal(resolveInviteTokenLifecycleStatus(revokedAfterUse, now), "revoked");

  assert.throws(
    () => consumeInviteToken(expiredToken, { consumedAt: now }),
    (error: unknown) => {
      return (
        error instanceof InvalidInviteTokenConsumptionError &&
        error.lifecycleStatus === "expired" &&
        error.statusCode === 401
      );
    },
  );

  assert.throws(
    () =>
      revokeInviteToken(baseToken, {
        reason: "   ",
        revokedAt: now,
      }),
    /revocation reason is required/,
  );
}

function testInviteTokenValidationService(): void {
  const now = new Date("2026-04-30T12:00:00.000Z");
  const baseToken: InviteToken = {
    id: "invite-1",
    guestGroupId: "group-1",
    guestId: "guest-1",
    tokenHash: "hash",
    shortCode: "ABC123",
    channel: "manual",
    status: "issued",
    issuedAt: new Date("2026-04-25T12:00:00.000Z"),
    expiresAt: new Date("2026-05-01T12:00:00.000Z"),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  assert.deepEqual(validateInviteToken(null, now), {
    ok: false,
    reason: "not_found",
    lifecycleStatus: null,
  });

  assert.deepEqual(validateInviteToken(baseToken, now), {
    ok: true,
    inviteToken: baseToken,
    lifecycleStatus: "issued",
  });

  for (const [token, reason] of [
    [
      {
        ...baseToken,
        expiresAt: new Date("2026-04-29T12:00:00.000Z"),
      },
      "expired",
    ],
    [
      {
        ...baseToken,
        status: "used" as const,
        usedAt: new Date("2026-04-29T12:00:00.000Z"),
      },
      "used",
    ],
    [
      {
        ...baseToken,
        status: "revoked" as const,
        revokedAt: new Date("2026-04-29T12:00:00.000Z"),
        revokedReason: "manual block",
      },
      "revoked",
    ],
  ] as const) {
    const validationResult = validateInviteToken(token, now);
    assert.equal(validationResult.ok, false);

    if (!validationResult.ok) {
      assert.equal(validationResult.reason, reason);
      assert.equal(validationResult.lifecycleStatus, reason);
    }

    assert.throws(
      () => assertInviteTokenIsUsable(token, now),
      (error: unknown) => {
        return (
          error instanceof InviteTokenValidationError &&
          error.reason === reason &&
          error.lifecycleStatus === reason &&
          error.statusCode === 401
        );
      },
    );
  }
}

async function testRevokeInviteTokenUseCase(): Promise<void> {
  const baseToken: InviteToken = {
    id: "invite-1",
    guestGroupId: "group-1",
    guestId: null,
    tokenHash: "hash",
    shortCode: "ABC123",
    channel: "manual",
    status: "used",
    issuedAt: new Date("2026-04-25T12:00:00.000Z"),
    expiresAt: new Date("2026-05-01T12:00:00.000Z"),
    usedAt: new Date("2026-04-29T12:00:00.000Z"),
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-29T12:00:00.000Z"),
  };
  const revokeCalls: Array<{ inviteTokenId: string; reason: string; revokedAt?: Date }> = [];
  const repository = {
    async findById(id: string) {
      if (id === baseToken.id) {
        return baseToken;
      }

      return null;
    },
    async revoke(input: { inviteTokenId: string; reason: string; revokedAt?: Date }) {
      revokeCalls.push(input);
      return {
        ...baseToken,
        status: "revoked" as const,
        revokedAt: input.revokedAt ?? new Date("2026-04-30T12:00:00.000Z"),
        revokedReason: input.reason,
      };
    },
  };
  const useCase = createRevokeInviteTokenUseCase({
    inviteTokenRepository: repository,
  });
  const revokedAt = new Date("2026-04-30T12:00:00.000Z");

  const result = await useCase.execute({
    inviteTokenId: "invite-1",
    reason: "security reset",
    revokedAt,
  });

  assert.equal(result.status, "revoked");
  assert.equal(result.revokedReason, "security reset");
  assert.equal(result.revokedAt?.toISOString(), revokedAt.toISOString());
  assert.deepEqual(revokeCalls, [
    {
      inviteTokenId: "invite-1",
      reason: "security reset",
      revokedAt,
    },
  ]);

  await assert.rejects(
    () =>
      useCase.execute({
        inviteTokenId: "missing",
        reason: "security reset",
      }),
    (error: unknown) => {
      return (
        error instanceof InviteTokenRevocationError &&
        error.reason === "not_found" &&
        error.statusCode === 404
      );
    },
  );

  await assert.rejects(
    () =>
      useCase.execute({
        inviteTokenId: "invite-1",
        reason: "   ",
      }),
    (error: unknown) => {
      return (
        error instanceof InviteTokenRevocationError &&
        error.reason === "invalid_reason" &&
        error.statusCode === 400
      );
    },
  );
}

async function testPrismaInviteTokenRepository(): Promise<void> {
  const persistenceRecord: PrismaInviteTokenRecord = {
    id: "invite-1",
    guestGroupId: "group-1",
    guestId: null,
    tokenHash: "hash-1",
    shortCode: "ABC123",
    channel: "MANUAL",
    status: "ISSUED",
    issuedAt: new Date("2026-04-25T12:00:00.000Z"),
    expiresAt: new Date("2026-05-01T12:00:00.000Z"),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: { where: { id?: string; tokenHash?: string } }) {
      calls.push({ method: "findUnique", args });
      return persistenceRecord;
    },
    async findFirst(args: {
      where: { shortCode: string };
      orderBy: { createdAt: "asc" | "desc" };
    }) {
      calls.push({ method: "findFirst", args });
      return persistenceRecord;
    },
    async findMany(args: {
      where: { guestId?: string; guestGroupId?: string; status?: string };
      orderBy: { createdAt: "asc" | "desc" };
      skip: number;
      take: number;
    }) {
      calls.push({ method: "findMany", args });
      return [persistenceRecord];
    },
    async upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      calls.push({ method: "upsert", args });
      return {
        ...persistenceRecord,
        ...args.update,
      };
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      calls.push({ method: "update", args });
      return {
        ...persistenceRecord,
        ...args.data,
      };
    },
  };

  const repository = new PrismaInviteTokenRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaInviteTokenRepository>[0],
  );

  const foundById = await repository.findById("invite-1");
  assert.equal(foundById?.status, "issued");
  assert.equal(foundById?.channel, "manual");

  const foundByHash = await repository.findByTokenHash("hash-1");
  assert.equal(foundByHash?.tokenHash, "hash-1");

  const foundByShortCode = await repository.findByShortCode("ABC123");
  assert.equal(foundByShortCode?.shortCode, "ABC123");

  const listed = await repository.findMany({
    page: 2,
    pageSize: 10,
    guestGroupId: "group-1",
    status: "issued",
  });
  assert.equal(listed.length, 1);

  const saved = await repository.save({
    id: "invite-2",
    guestGroupId: "group-2",
    guestId: null,
    tokenHash: "hash-2",
    shortCode: "XYZ999",
    channel: "email",
    status: "issued",
    issuedAt: new Date("2026-05-01T10:00:00.000Z"),
    expiresAt: new Date("2026-05-08T10:00:00.000Z"),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  });
  assert.equal(saved.channel, "email");

  const used = await repository.markAsUsed({
    inviteTokenId: "invite-1",
    usedAt: new Date("2026-05-01T12:00:00.000Z"),
  });
  assert.equal(used.status, "used");

  const revoked = await repository.revoke({
    inviteTokenId: "invite-1",
    reason: "security reset",
    revokedAt: new Date("2026-05-01T13:00:00.000Z"),
  });
  assert.equal(revoked.status, "revoked");
  assert.equal(revoked.revokedReason, "security reset");

  assert.deepEqual(calls[0], {
    method: "findUnique",
    args: { where: { id: "invite-1" } },
  });
  assert.deepEqual(calls[2], {
    method: "findFirst",
    args: { where: { shortCode: "ABC123" }, orderBy: { createdAt: "desc" } },
  });
  assert.deepEqual(calls[3], {
    method: "findMany",
    args: {
      where: { guestId: undefined, guestGroupId: "group-1", status: "ISSUED" },
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    },
  });
}

async function testPrismaInviteTokenTransactionRunner(): Promise<void> {
  const updates: Record<string, unknown>[] = [];
  const transactionRecord: PrismaInviteTokenRecord = {
    id: "invite-1",
    guestGroupId: "group-1",
    guestId: null,
    tokenHash: "hash-1",
    shortCode: "ABC123",
    channel: "MANUAL",
    status: "ISSUED",
    issuedAt: new Date("2026-04-25T12:00:00.000Z"),
    expiresAt: new Date("2026-05-01T12:00:00.000Z"),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  const inviteTokenDelegate = {
    async findUnique(args: { where: { id?: string; tokenHash?: string } }) {
      if (args.where.id !== "invite-1") {
        return null;
      }

      return transactionRecord;
    },
    async findFirst() {
      return null;
    },
    async findMany() {
      return [];
    },
    async upsert() {
      throw new Error("not used");
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      updates.push(args);
      return {
        ...transactionRecord,
        id: args.where.id,
        status: "USED",
        usedAt: args.data.usedAt as Date,
        updatedAt: new Date("2026-05-01T14:00:00.000Z"),
      } satisfies PrismaInviteTokenRecord;
    },
  };

  const prisma: {
    inviteToken: typeof inviteTokenDelegate;
    $transaction<T>(
      operation: (transactionClient: { inviteToken: typeof inviteTokenDelegate }) => Promise<T>,
    ): Promise<T>;
  } = {
    inviteToken: {
      ...inviteTokenDelegate,
    },
    async $transaction<T>(
      operation: (transactionClient: { inviteToken: typeof inviteTokenDelegate }) => Promise<T>,
    ) {
      return operation({ inviteToken: this.inviteToken });
    },
  };

  const runner = new PrismaInviteTokenConsumptionTransactionRunner(prisma);
  const result = await runner.run(async (context) => {
    const inviteToken = await context.findInviteTokenById("invite-1");
    assert.equal(inviteToken?.status, "issued");

    return context.markInviteTokenAsUsed({
      inviteTokenId: "invite-1",
      usedAt: new Date("2026-05-01T14:00:00.000Z"),
    });
  });

  assert.equal(result.status, "used");
  assert.equal(updates.length, 1);
}

async function testPrismaGuestRepository(): Promise<void> {
  const persistenceRecord: PrismaGuestRecord = {
    id: "guest-1",
    guestGroupId: "group-1",
    fullName: "Joao Silva",
    phone: null,
    email: "joao@example.com",
    isPrimary: true,
    status: "ACTIVE",
    lastAccessAt: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: { where: { id: string } }) {
      calls.push({ method: "findUnique", args });
      return persistenceRecord;
    },
    async findFirst(args: {
      where: { guestGroupId: string; isPrimary?: boolean };
      orderBy: { createdAt: "asc" | "desc" };
    }) {
      calls.push({ method: "findFirst", args });
      return persistenceRecord;
    },
    async findMany(args: {
      where: { guestGroupId?: string; status?: string };
      orderBy: { createdAt: "asc" | "desc" };
      skip: number;
      take: number;
    }) {
      calls.push({ method: "findMany", args });
      return [persistenceRecord];
    },
    async upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      calls.push({ method: "upsert", args });
      return {
        ...persistenceRecord,
        ...args.update,
      };
    },
  };

  const repository = new PrismaGuestRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaGuestRepository>[0],
  );

  const foundById = await repository.findById("guest-1");
  assert.equal(foundById?.status, "active");

  const foundPrimary = await repository.findPrimaryByGroupId("group-1");
  assert.equal(foundPrimary?.isPrimary, true);

  const listed = await repository.findMany({
    page: 1,
    pageSize: 20,
    guestGroupId: "group-1",
    status: "active",
  });
  assert.equal(listed.length, 1);

  const saved = await repository.save({
    id: "guest-2",
    guestGroupId: "group-2",
    fullName: "Maria Silva",
    phone: null,
    email: "maria@example.com",
    isPrimary: false,
    status: "inactive",
    lastAccessAt: null,
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  });
  assert.equal(saved.status, "inactive");
}

async function testPrismaGuestsRsvpGuestRepository(): Promise<void> {
  const persistenceRecord: PrismaGuestRecord = {
    id: "guest-rsvp-1",
    guestGroupId: "group-1",
    fullName: "Ana Souza",
    phone: "11999990000",
    email: "ana@example.com",
    isPrimary: true,
    status: "ACTIVE",
    lastAccessAt: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: { where: { id: string } }) {
      calls.push({ method: "findUnique", args });
      return persistenceRecord;
    },
    async findFirst(args: {
      where: { guestGroupId: string; isPrimary?: boolean };
      orderBy: { createdAt: "asc" | "desc" };
    }) {
      calls.push({ method: "findFirst", args });
      return persistenceRecord;
    },
    async findMany(args: {
      where: { guestGroupId?: string; status?: string; OR?: Record<string, unknown>[] };
      orderBy: { createdAt: "asc" | "desc" };
      skip: number;
      take: number;
    }) {
      calls.push({ method: "findMany", args });
      return [persistenceRecord];
    },
    async upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      calls.push({ method: "upsert", args });
      return {
        ...persistenceRecord,
        ...args.update,
      };
    },
  };

  const repository = new PrismaGuestsRsvpGuestRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaGuestsRsvpGuestRepository>[0],
  );

  const foundById = await repository.findById("guest-rsvp-1");
  assert.equal(foundById?.status, "active");

  const foundPrimary = await repository.findPrimaryByGroupId("group-1");
  assert.equal(foundPrimary?.isPrimary, true);

  const listed = await repository.findMany({
    page: 2,
    pageSize: 10,
    guestGroupId: "group-1",
    status: "active",
    search: "ana",
  });
  assert.equal(listed.length, 1);

  const saved = await repository.save({
    id: "guest-rsvp-2",
    guestGroupId: "group-2",
    fullName: "Bruno Souza",
    phone: null,
    email: "bruno@example.com",
    isPrimary: false,
    status: "inactive",
    lastAccessAt: null,
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  });
  assert.equal(saved.status, "inactive");

  assert.deepEqual(calls[2], {
    method: "findMany",
    args: {
      where: {
        guestGroupId: "group-1",
        status: "ACTIVE",
        OR: [
          { fullName: { contains: "ana", mode: "insensitive" } },
          { email: { contains: "ana", mode: "insensitive" } },
          { phone: { contains: "ana", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    },
  });
}

async function testPrismaGuestGroupRepository(): Promise<void> {
  const persistenceRecord: PrismaGuestGroupRecord = {
    id: "group-1",
    displayName: "Familia Souza",
    groupCode: "SOUZA01",
    allowedCompanions: 2,
    primaryContactName: "Ana Souza",
    primaryContactPhone: "11999990000",
    primaryContactEmail: "ana@example.com",
    notes: "Mesa perto do palco",
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: { where: { id?: string; groupCode?: string } }) {
      calls.push({ method: "findUnique", args });
      return persistenceRecord;
    },
    async findMany(args: {
      where: { groupCode?: string; OR?: Record<string, unknown>[] };
      orderBy: { createdAt: "asc" | "desc" };
      skip: number;
      take: number;
    }) {
      calls.push({ method: "findMany", args });
      return [persistenceRecord];
    },
    async upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      calls.push({ method: "upsert", args });
      return {
        ...persistenceRecord,
        ...args.update,
      };
    },
  };

  const repository = new PrismaGuestGroupRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaGuestGroupRepository>[0],
  );

  const foundById = await repository.findById("group-1");
  assert.equal(foundById?.groupCode, "SOUZA01");

  const foundByCode = await repository.findByGroupCode("SOUZA01");
  assert.equal(foundByCode?.displayName, "Familia Souza");

  const listed = await repository.findMany({
    page: 1,
    pageSize: 20,
    groupCode: "SOUZA01",
    search: "ana",
  });
  assert.equal(listed.length, 1);

  const saved = await repository.save({
    id: "group-2",
    displayName: "Familia Lima",
    groupCode: "LIMA02",
    allowedCompanions: 1,
    primaryContactName: "Carlos Lima",
    primaryContactPhone: null,
    primaryContactEmail: "carlos@example.com",
    notes: null,
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  });
  assert.equal(saved.allowedCompanions, 1);

  assert.deepEqual(calls[2], {
    method: "findMany",
    args: {
      where: {
        groupCode: "SOUZA01",
        OR: [
          { displayName: { contains: "ana", mode: "insensitive" } },
          { primaryContactName: { contains: "ana", mode: "insensitive" } },
          { primaryContactEmail: { contains: "ana", mode: "insensitive" } },
          { groupCode: { contains: "ana", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    },
  });
}

async function testPrismaEventRepository(): Promise<void> {
  const persistenceRecord: PrismaEventRecord = {
    id: "event-1",
    slug: "casamento",
    name: "Casamento",
    eventType: "WEDDING",
    startsAt: new Date("2026-07-12T16:00:00.000Z"),
    venueName: "Espaco Jardim",
    addressLine: "Rua das Flores",
    addressNumber: "100",
    neighborhood: "Centro",
    city: "Sao Paulo",
    state: "SP",
    postalCode: "01000-000",
    latitude: { toNumber: () => -23.55052 } as PrismaEventRecord["latitude"],
    longitude: { toNumber: () => -46.633308 } as PrismaEventRecord["longitude"],
    mapUrl: "https://maps.example.com/casamento",
    notes: "Chegar com 30 minutos de antecedencia",
    isActive: true,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: { where: { id?: string; slug?: string } }) {
      calls.push({ method: "findUnique", args });
      return persistenceRecord;
    },
    async findMany(args: {
      where: { isActive?: boolean; eventType?: string; slug?: string };
      orderBy: { startsAt: "asc" | "desc" };
      skip: number;
      take: number;
    }) {
      calls.push({ method: "findMany", args });
      return [persistenceRecord];
    },
    async upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      calls.push({ method: "upsert", args });
      return {
        ...persistenceRecord,
        ...args.update,
        latitude: { toNumber: () => Number(args.update.latitude ?? 0) },
        longitude: { toNumber: () => Number(args.update.longitude ?? 0) },
      };
    },
  };

  const repository = new PrismaEventRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaEventRepository>[0],
  );

  const foundById = await repository.findById("event-1");
  assert.equal(foundById?.eventType, "wedding");
  assert.equal(foundById?.location.latitude, -23.55052);

  const foundBySlug = await repository.findBySlug("casamento");
  assert.equal(foundBySlug?.slug, "casamento");

  const listed = await repository.findMany({
    page: 1,
    pageSize: 10,
    isActive: true,
    eventType: "wedding",
    slug: "casamento",
  });
  assert.equal(listed.length, 1);

  const saved = await repository.save({
    id: "event-2",
    slug: "cha-bar",
    name: "Cha Bar",
    eventType: "bridal_shower",
    startsAt: new Date("2026-06-01T15:00:00.000Z"),
    location: {
      venueName: "Casa da Familia",
      addressLine: "Rua A",
      addressNumber: null,
      neighborhood: null,
      city: "Campinas",
      state: "SP",
      postalCode: null,
      latitude: null,
      longitude: null,
      mapUrl: null,
    },
    notes: null,
    isActive: false,
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  });
  assert.equal(saved.eventType, "bridal_shower");
  assert.equal(saved.location.city, "Campinas");

  assert.deepEqual(calls[2], {
    method: "findMany",
    args: {
      where: {
        isActive: true,
        eventType: "WEDDING",
        slug: "casamento",
      },
      orderBy: { startsAt: "asc" },
      skip: 0,
      take: 10,
    },
  });
}

async function testPrismaAdminUserRepository(): Promise<void> {
  const persistenceRecord: PrismaAdminUserRecord = {
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
    authProvider: "email_magic_link",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    lastLoginAt: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: { where: { id?: string; email?: string } }) {
      calls.push({ method: "findUnique", args });
      return persistenceRecord;
    },
    async findMany(args: {
      where: Record<string, unknown>;
      orderBy: { createdAt: "asc" | "desc" };
      skip: number;
      take: number;
    }) {
      calls.push({ method: "findMany", args });
      return [persistenceRecord];
    },
    async upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      calls.push({ method: "upsert", args });
      return {
        ...persistenceRecord,
        ...args.update,
      };
    },
  };

  const repository = new PrismaAdminUserRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaAdminUserRepository>[0],
  );

  const foundById = await repository.findById("admin-1");
  assert.equal(foundById?.role, "super_admin");

  const foundByEmail = await repository.findByEmail("admin@example.com");
  assert.equal(foundByEmail?.email, "admin@example.com");

  const listed = await repository.findMany({
    page: 1,
    pageSize: 20,
    role: "super_admin",
    status: "active",
    search: "admin",
  });
  assert.equal(listed.length, 1);

  const saved = await repository.save({
    id: "admin-2",
    name: "Editor User",
    email: "editor@example.com",
    authProvider: "email_magic_link",
    role: "editor",
    status: "disabled",
    lastLoginAt: null,
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  });
  assert.equal(saved.role, "editor");
  assert.equal(saved.status, "disabled");

  assert.deepEqual(calls[1], {
    method: "findUnique",
    args: { where: { email: "admin@example.com" } },
  });
}

async function testLoginGuestWithInviteTokenUseCase(): Promise<void> {
  const baseGuest: IdentityAccessGuest = {
    id: "guest-1",
    guestGroupId: "group-1",
    fullName: "Joao Silva",
    phone: null,
    email: "joao@example.com",
    isPrimary: true,
    status: "active",
    lastAccessAt: null,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };

  const baseInviteToken: InviteToken = {
    id: "invite-1",
    guestGroupId: "group-1",
    guestId: "guest-1",
    tokenHash: "valid-token",
    shortCode: "ABC123",
    channel: "manual",
    status: "issued",
    issuedAt: new Date("2026-04-25T12:00:00.000Z"),
    expiresAt: new Date("2026-05-10T12:00:00.000Z"),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };

  let markCalls = 0;
  const expiredToken: InviteToken = {
    ...baseInviteToken,
    id: "invite-expired",
    tokenHash: "expired-token",
    expiresAt: new Date("2026-04-29T12:00:00.000Z"),
  };
  const usedToken: InviteToken = {
    ...baseInviteToken,
    id: "invite-used",
    tokenHash: "used-token",
    status: "used",
    usedAt: new Date("2026-04-28T12:00:00.000Z"),
  };
  const revokedToken: InviteToken = {
    ...baseInviteToken,
    id: "invite-revoked",
    tokenHash: "revoked-token",
    status: "revoked",
    revokedAt: new Date("2026-04-28T12:00:00.000Z"),
    revokedReason: "manual revoke",
  };
  const groupToken: InviteToken = {
    ...baseInviteToken,
    id: "invite-group",
    guestId: null,
    tokenHash: "group-token",
    shortCode: "GROUP01",
  };
  const missingGuestToken: InviteToken = {
    ...baseInviteToken,
    id: "invite-missing-guest",
    guestId: "guest-missing",
    tokenHash: "missing-guest-token",
    shortCode: "MISS01",
  };
  const inactiveGuestToken: InviteToken = {
    ...baseInviteToken,
    id: "invite-inactive-guest",
    guestId: "guest-inactive",
    tokenHash: "inactive-guest-token",
    shortCode: "INACT1",
  };

  const inviteTokenRepository: {
    findById(id: string): Promise<InviteToken | null>;
    save(entity: InviteToken): Promise<InviteToken>;
    findMany(): Promise<readonly InviteToken[]>;
    findByTokenHash(tokenHash: string): Promise<InviteToken | null>;
    findByShortCode(shortCode: string): Promise<InviteToken | null>;
    markAsUsed(input: { inviteTokenId: string; usedAt?: Date }): Promise<InviteToken>;
    revoke(input?: unknown): Promise<InviteToken>;
  } = {
    async findById() {
      return null;
    },
    async save(entity: InviteToken) {
      return entity;
    },
    async findMany() {
      return [] as const;
    },
    async findByTokenHash(tokenHash: string) {
      if (tokenHash === "valid-token") {
        return baseInviteToken;
      }

      if (tokenHash === "group-token") {
        return groupToken;
      }

      if (tokenHash === "expired-token") {
        return expiredToken;
      }

      if (tokenHash === "used-token") {
        return usedToken;
      }

      if (tokenHash === "revoked-token") {
        return revokedToken;
      }

      if (tokenHash === "missing-guest-token") {
        return missingGuestToken;
      }

      if (tokenHash === "inactive-guest-token") {
        return inactiveGuestToken;
      }

      return null;
    },
    async findByShortCode(shortCode: string) {
      if (shortCode === "ABC123") {
        return baseInviteToken;
      }

      if (shortCode === "GROUP01") {
        return groupToken;
      }

      if (shortCode === "EXPR01") {
        return expiredToken;
      }

      if (shortCode === "USED01") {
        return usedToken;
      }

      if (shortCode === "REVOK1") {
        return revokedToken;
      }

      if (shortCode === "MISS01") {
        return missingGuestToken;
      }

      if (shortCode === "INACT1") {
        return inactiveGuestToken;
      }

      return null;
    },
    async markAsUsed(input: { inviteTokenId: string; usedAt?: Date }) {
      markCalls += 1;
      return {
        ...baseInviteToken,
        id: input.inviteTokenId,
        status: "used" as const,
        usedAt: input.usedAt ?? new Date(),
      };
    },
    async revoke() {
      return {
        ...baseInviteToken,
        status: "revoked" as const,
      };
    },
  };

  const guestRepository = {
    async findById(id: string) {
      if (id === "guest-1") {
        return baseGuest;
      }

      if (id === "guest-inactive") {
        return {
          ...baseGuest,
          id,
          status: "inactive" as const,
        };
      }

      return null;
    },
    async save(entity: IdentityAccessGuest) {
      return entity;
    },
    async findMany() {
      return [] as const;
    },
    async findPrimaryByGroupId(guestGroupId: string) {
      if (guestGroupId === "group-1") {
        return baseGuest;
      }

      return null;
    },
  };

  const transactionRunner = {
    async run<T>(operation: (context: {
      findInviteTokenById(inviteTokenId: string): Promise<InviteToken | null>;
      markInviteTokenAsUsed(input: { inviteTokenId: string; usedAt?: Date }): Promise<InviteToken>;
    }) => Promise<T>) {
      return operation({
        async findInviteTokenById(inviteTokenId: string) {
          if (inviteTokenId === "invite-group") {
            return {
              ...baseInviteToken,
              id: inviteTokenId,
              guestId: null,
            };
          }

          if (inviteTokenId === "invite-1") {
            return baseInviteToken;
          }

          return null;
        },
        async markInviteTokenAsUsed(input) {
          return inviteTokenRepository.markAsUsed(input);
        },
      });
    },
  };

  const authMoments = [
    new Date("2026-04-30T12:00:00.000Z"),
    new Date("2026-04-30T12:00:05.000Z"),
  ];
  const useCase = createLoginGuestWithInviteTokenUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner: transactionRunner,
    now: () => authMoments.shift() ?? new Date("2026-04-30T12:00:05.000Z"),
  });

  const directLogin = await useCase.execute({
    token: "valid-token",
    requestId: "req-1",
  });
  assert.deepEqual(directLogin, {
    guestId: "guest-1",
    guestGroupId: "group-1",
    inviteTokenId: "invite-1",
    authenticatedAt: new Date("2026-04-30T12:00:05.000Z"),
  });

  const groupLoginUseCase = createLoginGuestWithInviteTokenUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner: transactionRunner,
    now: () => new Date("2026-04-30T13:00:00.000Z"),
  });
  const groupLogin = await groupLoginUseCase.execute({ token: "group-token" });
  assert.equal(groupLogin.guestId, "guest-1");
  assert.equal(markCalls, 2);

  const failingUseCase = createLoginGuestWithInviteTokenUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner: transactionRunner,
    now: () => new Date("2026-04-30T12:00:00.000Z"),
  });

  for (const token of [
    "missing-token",
    "expired-token",
    "used-token",
    "revoked-token",
    "missing-guest-token",
    "inactive-guest-token",
  ]) {
    await assert.rejects(() => failingUseCase.execute({ token }), (error: unknown) => {
      return error instanceof GuestInviteTokenAuthenticationError;
    });
  }

  markCalls = 0;
  const shortCodeUseCase = createLoginGuestWithShortCodeUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner: transactionRunner,
    now: () => new Date("2026-04-30T15:00:00.000Z"),
  });

  const shortCodeLogin = await shortCodeUseCase.execute({ code: "ABC123" });
  assert.deepEqual(shortCodeLogin, {
    guestId: "guest-1",
    guestGroupId: "group-1",
    inviteTokenId: "invite-1",
    authenticatedAt: new Date("2026-04-30T15:00:00.000Z"),
  });

  const shortCodeGroupLogin = await shortCodeUseCase.execute({ code: "GROUP01" });
  assert.equal(shortCodeGroupLogin.guestId, "guest-1");
  assert.equal(markCalls, 2);

  for (const code of ["UNKNOWN", "EXPR01", "USED01", "REVOK1", "MISS01", "INACT1"]) {
    await assert.rejects(() => shortCodeUseCase.execute({ code }), (error: unknown) => {
      return error instanceof GuestInviteTokenAuthenticationError;
    });
  }
}

async function testAdminMagicLinkService(): Promise<void> {
  const now = new Date("2026-05-02T12:00:00.000Z");
  const service = new SignedAdminMagicLinkService(
    "12345678901234567890123456789012",
    300,
    () => now,
  );

  const issued = await service.issueMagicLink({
    adminUserId: "admin-1",
    email: "admin@example.com",
    role: "super_admin",
    issuedAt: now,
  });

  assert.equal(typeof issued.token, "string");
  assert.equal(issued.payload.actorType, "admin");
  assert.equal(issued.payload.adminUserId, "admin-1");
  assert.equal(issued.payload.email, "admin@example.com");
  assert.equal(issued.payload.role, "super_admin");
  assert.equal(issued.payload.purpose, "admin_magic_link");
  assert.equal(issued.expiresAt.toISOString(), "2026-05-02T12:05:00.000Z");
}

async function testAdminSessionService(): Promise<void> {
  const now = new Date("2026-05-02T12:00:00.000Z");
  const service = new SignedAdminSessionService(
    "12345678901234567890123456789012",
    300,
    () => now,
  );
  const guestService = new SignedGuestSessionService(
    "12345678901234567890123456789012",
    300,
    () => now,
  );

  const issued = await service.issueSession({
    adminUserId: "admin-1",
    role: "super_admin",
    issuedAt: now,
  });

  assert.equal(typeof issued.accessToken, "string");
  assert.equal(issued.payload.actorType, "admin");
  assert.equal(issued.payload.adminUserId, "admin-1");
  assert.equal(issued.payload.role, "super_admin");
  assert.equal(issued.expiresAt.toISOString(), "2026-05-02T12:05:00.000Z");

  const verified = await service.verifySession({
    token: issued.accessToken,
    requestId: "req-admin-1",
  });
  assert.deepEqual(verified, {
    actorType: "admin",
    adminUserId: "admin-1",
    role: "super_admin",
  });

  const issuedGuestSession = await guestService.issueSession({
    guestId: "guest-1",
    guestGroupId: "group-1",
    issuedAt: now,
  });
  const verifiedGuest = await service.verifySession({
    token: issuedGuestSession.accessToken,
    requestId: "req-admin-2",
  });
  assert.deepEqual(verifiedGuest, {
    actorType: "guest",
    guestId: "guest-1",
    guestGroupId: "group-1",
  });

  const expiredService = new SignedAdminSessionService(
    "12345678901234567890123456789012",
    300,
    () => new Date("2026-05-02T12:06:00.000Z"),
  );
  assert.equal(
    await expiredService.verifySession({
      token: issued.accessToken,
      requestId: "req-admin-3",
    }),
    null,
  );
  assert.equal(
    await service.verifySession({
      token: "malformed-token",
      requestId: "req-admin-4",
    }),
    null,
  );

  const tamperedToken = `${issued.accessToken.slice(0, -1)}x`;
  assert.equal(
    await service.verifySession({
      token: tamperedToken,
      requestId: "req-admin-5",
    }),
    null,
  );
}

async function testRequestAdminMagicLinkUseCase(): Promise<void> {
  const activeAdmin: AdminUser = {
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
    authProvider: "email_magic_link",
    role: "super_admin",
    status: "active",
    lastLoginAt: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };
  const disabledAdmin: AdminUser = {
    ...activeAdmin,
    id: "admin-2",
    email: "disabled@example.com",
    status: "disabled",
  };
  const issuedMagicLinks: AdminMagicLinkIssueInput[] = [];
  const dispatchedMagicLinks: Array<{
    adminUserId: string;
    email: string;
    name: string;
    role: string;
    token: string;
    expiresAt: Date;
    requestId?: string;
  }> = [];
  const issuer = {
    async issueMagicLink(input: AdminMagicLinkIssueInput): Promise<AdminMagicLinkIssueResult> {
      issuedMagicLinks.push(input);

      return {
        token: "signed-admin-token",
        expiresAt: new Date("2026-05-02T12:15:00.000Z"),
        payload: {
          actorType: "admin",
          adminUserId: input.adminUserId,
          email: input.email,
          role: input.role,
          purpose: "admin_magic_link",
          iat: 1,
          exp: 2,
        },
      };
    },
  };
  const dispatcher = {
    async dispatchMagicLink(input: {
      adminUserId: string;
      email: string;
      name: string;
      role: string;
      token: string;
      expiresAt: Date;
      requestId?: string;
    }): Promise<void> {
      dispatchedMagicLinks.push(input);
    },
  };
  const useCase = createRequestAdminMagicLinkUseCase({
    adminUserRepository: {
      async findByEmail(email: string) {
        if (email === activeAdmin.email) {
          return activeAdmin;
        }

        if (email === disabledAdmin.email) {
          return disabledAdmin;
        }

        return null;
      },
    },
    adminMagicLinkIssuer: issuer,
    adminMagicLinkDispatcher: dispatcher,
  });

  const acceptedForActive = await useCase.execute({
    email: activeAdmin.email,
    requestId: "req-1",
  });
  const acceptedForMissing = await useCase.execute({
    email: "missing@example.com",
    requestId: "req-2",
  });
  const acceptedForDisabled = await useCase.execute({
    email: disabledAdmin.email,
    requestId: "req-3",
  });

  assert.deepEqual(acceptedForActive, { accepted: true });
  assert.deepEqual(acceptedForMissing, { accepted: true });
  assert.deepEqual(acceptedForDisabled, { accepted: true });
  assert.deepEqual(issuedMagicLinks, [
    {
      adminUserId: "admin-1",
      email: "admin@example.com",
      role: "super_admin",
    },
  ]);
  assert.deepEqual(dispatchedMagicLinks, [
    {
      adminUserId: "admin-1",
      email: "admin@example.com",
      name: "Admin User",
      role: "super_admin",
      token: "signed-admin-token",
      expiresAt: new Date("2026-05-02T12:15:00.000Z"),
      requestId: "req-1",
    },
  ]);
}

async function testGuestSessionService(): Promise<void> {
  const now = new Date("2026-05-02T12:00:00.000Z");
  const service = new SignedGuestSessionService(
    "12345678901234567890123456789012",
    60,
    () => now,
  );

  const issued = await service.issueSession({
    guestId: "guest-1",
    guestGroupId: "group-1",
    issuedAt: now,
  });

  assert.equal(typeof issued.accessToken, "string");
  assert.equal(issued.payload.actorType, "guest");
  assert.equal(issued.payload.guestId, "guest-1");
  assert.equal(issued.payload.guestGroupId, "group-1");
  assert.equal(issued.expiresAt.toISOString(), "2026-05-02T12:01:00.000Z");

  const verified = await service.verifySession({
    token: issued.accessToken,
    requestId: "req-1",
  });
  assert.deepEqual(verified, {
    actorType: "guest",
    guestId: "guest-1",
    guestGroupId: "group-1",
  });

  const expiredService = new SignedGuestSessionService(
    "12345678901234567890123456789012",
    60,
    () => new Date("2026-05-02T12:02:00.000Z"),
  );
  assert.equal(
    await expiredService.verifySession({
      token: issued.accessToken,
      requestId: "req-2",
    }),
    null,
  );

  assert.equal(
    await service.verifySession({
      token: "malformed-token",
      requestId: "req-3",
    }),
    null,
  );

  const tamperedToken = `${issued.accessToken.slice(0, -1)}x`;
  assert.equal(
    await service.verifySession({
      token: tamperedToken,
      requestId: "req-4",
    }),
    null,
  );

  const tokenParts = issued.accessToken.split(".");
  const actorPayload = {
    actorType: "admin",
    guestId: "guest-1",
    guestGroupId: "group-1",
    iat: issued.payload.iat,
    exp: issued.payload.exp,
  };
  const encodedActorPayload = Buffer.from(JSON.stringify(actorPayload), "utf8").toString("base64url");
  const invalidActorToken = `${tokenParts[0]}.${encodedActorPayload}.${tokenParts[2]}`;
  assert.equal(
    await service.verifySession({
      token: invalidActorToken,
      requestId: "req-5",
    }),
    null,
  );
}

function testGuestSessionCookieAttributes(): void {
  const expiresAt = new Date("2026-06-01T12:00:00.000Z");
  const developmentCookie = buildGuestSessionCookieAttributes({
    nodeEnv: "development",
    expiresAt,
  });
  const productionCookie = buildGuestSessionCookieAttributes({
    nodeEnv: "production",
    expiresAt,
  });

  assert.equal(developmentCookie.name, "weddingos_guest_session");
  assert.equal(developmentCookie.httpOnly, true);
  assert.equal(developmentCookie.sameSite, "lax");
  assert.equal(developmentCookie.path, "/");
  assert.equal(developmentCookie.secure, false);
  assert.equal(productionCookie.secure, true);
  assert.equal(developmentCookie.expires, expiresAt);
}

async function testIssueGuestSessionUseCase(): Promise<void> {
  const now = new Date("2026-05-02T12:00:00.000Z");
  const service = new SignedGuestSessionService(
    "12345678901234567890123456789012",
    60,
    () => now,
  );
  const useCase = createIssueGuestSessionUseCase({
    guestSessionIssuer: service,
    env: { NODE_ENV: "test" },
  });

  const result = await useCase.execute({
    authenticationResult: {
      guestId: "guest-1",
      guestGroupId: "group-1",
      inviteTokenId: "invite-1",
      authenticatedAt: now,
    },
  });

  assert.equal(result.actorType, "guest");
  assert.equal(result.actorId, "guest-1");
  assert.equal(typeof result.accessToken, "string");
  assert.equal(result.expiresAt.toISOString(), "2026-05-02T12:01:00.000Z");
  assert.equal(result.cookie.httpOnly, true);
  assert.equal(result.cookie.secure, false);
}

async function testAdminRoutesRequireAdminAuth(): Promise<void> {
  const env = createTestEnv();
  const app = await buildApp(env);
  const guestSessionService = new SignedGuestSessionService(env.JWT_SECRET, 300, () => new Date());
  const adminSessionService = new SignedAdminSessionService(env.JWT_SECRET, 300, () => new Date());

  try {
    const missingCredentials = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
    });
    assert.equal(missingCredentials.statusCode, 401);

    const guestSession = await guestSessionService.issueSession({
      guestId: "guest-1",
      guestGroupId: "group-1",
    });
    const guestResponse = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
      headers: {
        authorization: `Bearer ${guestSession.accessToken}`,
      },
    });
    assert.equal(guestResponse.statusCode, 403);

    const adminSession = await adminSessionService.issueSession({
      adminUserId: "admin-1",
      role: "super_admin",
    });
    const adminResponse = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
      headers: {
        authorization: `Bearer ${adminSession.accessToken}`,
      },
    });
    assert.equal(adminResponse.statusCode, 501);
  } finally {
    await app.close();
  }
}

async function run(): Promise<void> {
  await testEchoesIncomingRequestId();
  await testGeneratesRequestIdWhenMissing();
  await testLogsIncludeRequestIdWithoutSensitiveHeaders();
  await testBuildAppKeepsModuleRegistryConnected();
  await testDomainEntitiesAreExportedByModuleBarrels();
  await testBearerTokenResolution();
  await testAuthGuardsSeparateGuestAndAdmin();
  await testAccessPolicies();
  await testLoginGuestWithInviteTokenUseCase();
  await testAdminMagicLinkService();
  await testAdminSessionService();
  await testRequestAdminMagicLinkUseCase();
  await testGuestSessionService();
  await testIssueGuestSessionUseCase();
  await testAdminRoutesRequireAdminAuth();
  await testPrismaAdminUserRepository();
  await testPrismaGuestRepository();
  await testPrismaGuestsRsvpGuestRepository();
  await testPrismaGuestGroupRepository();
  await testPrismaEventRepository();
  await testPrismaInviteTokenRepository();
  await testPrismaInviteTokenTransactionRunner();
  await testRevokeInviteTokenUseCase();
  testModuleLayerContractsAreExported();
  testGuestSessionCookieAttributes();
  testGiftReservationConflictError();
  testInviteTokenLifecyclePolicies();
  testInviteTokenValidationService();
  testRsvpIdempotencyKeyBuilder();
  console.log("main.test.ts passed");
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
