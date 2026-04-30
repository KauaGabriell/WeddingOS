import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import type { FastifyRequest } from "fastify";
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
  GUESTS_RSVP_INFRASTRUCTURE_PORTS,
  GUESTS_RSVP_MODULE_USE_CASES,
  GUESTS_RSVP_ROUTE_ACCESS,
} from "./modules/guests-rsvp/index.js";
import {
  createAdminAuthGuard,
  createGuestAuthGuard,
  type GuestSessionVerifier,
  IDENTITY_ACCESS_HTTP_CONTRACT,
  IDENTITY_ACCESS_INFRASTRUCTURE_PORTS,
  IDENTITY_ACCESS_MODULE_USE_CASES,
  IDENTITY_ACCESS_ROUTE_ACCESS,
} from "./modules/identity-access/index.js";
import type { AdminUser, InviteToken } from "./modules/identity-access/index.js";
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

  assert.equal(IDENTITY_ACCESS_MODULE_USE_CASES.guestAuthentication, "planned");
  assert.equal(GUESTS_RSVP_MODULE_USE_CASES.rsvpSubmission, "planned");
  assert.equal(GIFT_REGISTRY_MODULE_USE_CASES.giftReservationLifecycle, "planned");
  assert.equal(PHOTO_WALL_MODULE_USE_CASES.photoSubmission, "planned");
  assert.equal(ADMIN_BACKOFFICE_MODULE_USE_CASES.auditTrailQuery, "planned");

  assert.equal(
    IDENTITY_ACCESS_INFRASTRUCTURE_PORTS.repositories.includes("invite-token-repository"),
    true,
  );
  assert.equal(
    GUESTS_RSVP_INFRASTRUCTURE_PORTS.repositories.includes("rsvp-response-repository"),
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
  assert.equal(GUESTS_RSVP_ROUTE_ACCESS.guestHome.config.access, "guest");
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

  const verifier: GuestSessionVerifier = {
    async verifySession({ token }) {
      if (token === "guest-token") {
        return guestPrincipal;
      }

      if (token === "admin-token") {
        return adminPrincipal;
      }

      return null;
    },
  };

  const guestGuard = createGuestAuthGuard(verifier);
  const adminGuard = createAdminAuthGuard(verifier);

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

async function run(): Promise<void> {
  await testEchoesIncomingRequestId();
  await testGeneratesRequestIdWhenMissing();
  await testLogsIncludeRequestIdWithoutSensitiveHeaders();
  await testBuildAppKeepsModuleRegistryConnected();
  await testDomainEntitiesAreExportedByModuleBarrels();
  await testBearerTokenResolution();
  await testAuthGuardsSeparateGuestAndAdmin();
  await testAccessPolicies();
  testModuleLayerContractsAreExported();
  testGiftReservationConflictError();
  console.log("main.test.ts passed");
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
