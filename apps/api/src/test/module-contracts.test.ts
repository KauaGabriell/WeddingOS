import assert from "node:assert/strict";
import {
  ADMIN_BACKOFFICE_HTTP_CONTRACT,
  ADMIN_BACKOFFICE_INFRASTRUCTURE_PORTS,
  ADMIN_BACKOFFICE_MODULE_USE_CASES,
  ADMIN_BACKOFFICE_ROUTE_ACCESS,
} from "../modules/admin-backoffice/index.js";
import type { AuditLog } from "../modules/admin-backoffice/index.js";
import {
  AdminGiftManagementError,
  GIFT_REGISTRY_HTTP_CONTRACT,
  GIFT_REGISTRY_HTTP_SCHEMAS,
  GIFT_REGISTRY_INFRASTRUCTURE_PORTS,
  GIFT_REGISTRY_MODULE_USE_CASES,
  GIFT_REGISTRY_ROUTE_ACCESS,
  GIFT_REGISTRY_TRANSACTIONAL_CONTRACTS,
  GiftRegistryApplicationError,
  GiftReservationManagementError,
  PrismaGiftReservationTransactionRunner,
  GiftReservationConflictError,
  createCreateGiftUseCase,
  createListAdminGiftsUseCase,
  createManageGiftReservationUseCase,
  createReserveGiftUseCase,
  createUpdateGiftUseCase,
} from "../modules/gift-registry/index.js";
import type { Gift, GiftReservation } from "../modules/gift-registry/index.js";
import type {
  Event,
  EventGuestEligibility,
  Guest,
  GuestGroup,
  RsvpResponse,
} from "../modules/guests-rsvp/index.js";
import {
  GUESTS_RSVP_HTTP_CONTRACT,
  GUESTS_RSVP_HTTP_SCHEMAS,
  GUESTS_RSVP_IDEMPOTENCY_CONTRACTS,
  GUESTS_RSVP_INFRASTRUCTURE_PORTS,
  GUESTS_RSVP_MODULE_USE_CASES,
  GUESTS_RSVP_ROUTE_ACCESS,
} from "../modules/guests-rsvp/index.js";
import {
  IDENTITY_ACCESS_HTTP_CONTRACT,
  IDENTITY_ACCESS_HTTP_SCHEMAS,
  IDENTITY_ACCESS_INFRASTRUCTURE_PORTS,
  IDENTITY_ACCESS_INVITE_TOKEN_LIFECYCLE_CONTRACTS,
  IDENTITY_ACCESS_MODULE_USE_CASES,
  IDENTITY_ACCESS_ROUTE_ACCESS,
} from "../modules/identity-access/index.js";
import type {
  AdminUser,
  InviteToken,
} from "../modules/identity-access/index.js";
import {
  PHOTO_WALL_HTTP_CONTRACT,
  PHOTO_WALL_INFRASTRUCTURE_PORTS,
  PHOTO_WALL_MODULE_USE_CASES,
  PhotoWallApplicationError,
  PhotoWallModerationError,
  PrismaPhotoPostRepository,
  StorageBackedPhotoStorageProvider,
  createCreatePhotoPostUseCase,
  createListApprovedPhotoPostsUseCase,
  createListModerationPhotoPostsUseCase,
  createModeratePhotoPostUseCase,
  PHOTO_WALL_ROUTE_ACCESS,
} from "../modules/photo-wall/index.js";
import type { PhotoPost } from "../modules/photo-wall/index.js";
import { runNamedTests } from "./test-helpers.js";

function testDomainEntitiesAreExportedByModuleBarrels(): void {
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
  assert.equal(GUESTS_RSVP_MODULE_USE_CASES.guestLookup, "implemented");
  assert.equal(GUESTS_RSVP_MODULE_USE_CASES.eventEligibilityResolution, "implemented");
  assert.equal(GUESTS_RSVP_MODULE_USE_CASES.rsvpSubmission, "implemented");
  assert.equal(GUESTS_RSVP_MODULE_USE_CASES.adminGuestQuery, "implemented");
  assert.equal(GIFT_REGISTRY_MODULE_USE_CASES.giftCatalogListing, "implemented");
  assert.equal(GIFT_REGISTRY_MODULE_USE_CASES.giftReservationLifecycle, "implemented");
  assert.equal(GIFT_REGISTRY_MODULE_USE_CASES.adminGiftRelease, "implemented");
  assert.equal(GIFT_REGISTRY_MODULE_USE_CASES.adminGiftManagement, "implemented");
  assert.equal(PHOTO_WALL_MODULE_USE_CASES.photoSubmission, "implemented");
  assert.equal(PHOTO_WALL_MODULE_USE_CASES.galleryListing, "implemented");
  assert.equal(PHOTO_WALL_MODULE_USE_CASES.moderationReview, "implemented");
  assert.equal(typeof createCreatePhotoPostUseCase, "function");
  assert.equal(typeof createListApprovedPhotoPostsUseCase, "function");
  assert.equal(typeof createListModerationPhotoPostsUseCase, "function");
  assert.equal(typeof createModeratePhotoPostUseCase, "function");
  assert.equal(typeof PhotoWallApplicationError, "function");
  assert.equal(typeof PhotoWallModerationError, "function");
  assert.equal(typeof PrismaPhotoPostRepository, "function");
  assert.equal(typeof StorageBackedPhotoStorageProvider, "function");
  assert.equal(ADMIN_BACKOFFICE_MODULE_USE_CASES.auditTrailQuery, "planned");
  assert.equal(IDENTITY_ACCESS_INFRASTRUCTURE_PORTS.repositories.includes("invite-token-repository"), true);
  assert.equal(GUESTS_RSVP_INFRASTRUCTURE_PORTS.repositories.includes("rsvp-response-repository"), true);
  assert.equal(GIFT_REGISTRY_INFRASTRUCTURE_PORTS.providers.includes("payment-proof-storage-provider"), true);
  assert.equal(PHOTO_WALL_INFRASTRUCTURE_PORTS.providers.includes("photo-storage-provider"), true);
  assert.equal(ADMIN_BACKOFFICE_INFRASTRUCTURE_PORTS.repositories.includes("audit-log-repository"), true);
  assert.equal(IDENTITY_ACCESS_ROUTE_ACCESS.loginWithInviteToken.config.access, "public");
  assert.equal(IDENTITY_ACCESS_INVITE_TOKEN_LIFECYCLE_CONTRACTS.usagePolicy, "single-use");
  assert.equal(GUESTS_RSVP_ROUTE_ACCESS.guestHome.config.access, "guest");
  assert.equal(GUESTS_RSVP_ROUTE_ACCESS.listAdminGuests.config.access, "admin");
  assert.equal(GUESTS_RSVP_ROUTE_ACCESS.listAdminRsvps.config.access, "admin");
  assert.equal(GUESTS_RSVP_IDEMPOTENCY_CONTRACTS.idempotencyKey, "eventId+guestId");
  assert.ok(GUESTS_RSVP_HTTP_SCHEMAS.queries.adminGuestList);
  assert.ok(GUESTS_RSVP_HTTP_SCHEMAS.queries.adminRsvpList);
  assert.ok(GIFT_REGISTRY_HTTP_SCHEMAS.queries.giftCatalog.shape.reservationStatus);
  assert.ok(GIFT_REGISTRY_HTTP_SCHEMAS.bodies.releaseReservation.shape.reassignToGuestId);
  assert.equal(GIFT_REGISTRY_ROUTE_ACCESS.reserveGift.config.access, "guest");
  assert.equal(PHOTO_WALL_ROUTE_ACCESS.createPhotoPost.config.access, "guest");
  assert.equal(ADMIN_BACKOFFICE_ROUTE_ACCESS.dashboard.config.access, "admin");
  assert.equal(GIFT_REGISTRY_TRANSACTIONAL_CONTRACTS.reserveAvailableGift, "transactional");
  assert.equal(typeof createListAdminGiftsUseCase, "function");
  assert.equal(typeof createCreateGiftUseCase, "function");
  assert.equal(typeof createUpdateGiftUseCase, "function");
  assert.equal(typeof createManageGiftReservationUseCase, "function");
  assert.equal(typeof createReserveGiftUseCase, "function");
  assert.equal(typeof PrismaGiftReservationTransactionRunner, "function");
  assert.equal(
    IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.adminLogin.parse({
      email: "admin@example.com",
      password: "ignored-by-schema",
    }).email,
    "admin@example.com",
  );
}

function testGiftReservationConflictError(): void {
  const error = new GiftReservationConflictError("gift-1");
  assert.equal(error.name, "GiftReservationConflictError");
  assert.equal(error.giftId, "gift-1");
  assert.equal(error.statusCode, 409);
}

function testGiftRegistryApplicationError(): void {
  const error = new GiftRegistryApplicationError("gift_unavailable");
  assert.equal(error.name, "GiftRegistryApplicationError");
  assert.equal(error.reason, "gift_unavailable");
  assert.equal(error.statusCode, 403);
}

function testGiftReservationManagementError(): void {
  const error = new GiftReservationManagementError("reservation_not_active");
  assert.equal(error.name, "GiftReservationManagementError");
  assert.equal(error.reason, "reservation_not_active");
  assert.equal(error.statusCode, 409);
}

function testAdminGiftManagementError(): void {
  const error = new AdminGiftManagementError("invalid_value_range");
  assert.equal(error.name, "AdminGiftManagementError");
  assert.equal(error.reason, "invalid_value_range");
  assert.equal(error.statusCode, 400);
}

function testPhotoWallModerationError(): void {
  const error = new PhotoWallModerationError("photo_post_already_removed");
  assert.equal(error.name, "PhotoWallModerationError");
  assert.equal(error.reason, "photo_post_already_removed");
  assert.equal(error.statusCode, 409);
}

function testGiftCatalogItemResponseContractMatchesApplicationShape(): void {
  const parsed = GIFT_REGISTRY_HTTP_SCHEMAS.responses.giftCatalogItem.parse({
    gift: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Jogo de panelas",
      category: "cozinha",
      description: null,
      estimatedValue: 199.9,
      imageUrl: null,
      displayOrder: 1,
      status: "available",
      isActive: true,
      createdAt: "2026-05-04T10:00:00.000Z",
      updatedAt: "2026-05-04T10:00:00.000Z",
    },
    activeReservation: {
      id: "550e8400-e29b-41d4-a716-446655440001",
      giftId: "550e8400-e29b-41d4-a716-446655440000",
      guestId: "550e8400-e29b-41d4-a716-446655440002",
      reservationStatus: "active",
      purchaseNotes: null,
      reservedAt: "2026-05-04T10:00:00.000Z",
      releasedAt: null,
      releasedByAdminUserId: null,
      createdAt: "2026-05-04T10:00:00.000Z",
      updatedAt: "2026-05-04T10:00:00.000Z",
    },
  });

  assert.equal(parsed.gift.name, "Jogo de panelas");
  assert.equal(parsed.activeReservation?.reservationStatus, "active");
}

export async function runModuleContractTests(): Promise<void> {
  await runNamedTests("module-contracts", [
    { name: "exports domain entities by barrels", run: testDomainEntitiesAreExportedByModuleBarrels },
    { name: "exports module layer contracts", run: testModuleLayerContractsAreExported },
    { name: "keeps gift reservation conflict error contract", run: testGiftReservationConflictError },
    { name: "keeps gift registry application error contract", run: testGiftRegistryApplicationError },
    { name: "keeps gift reservation management error contract", run: testGiftReservationManagementError },
    { name: "keeps admin gift management error contract", run: testAdminGiftManagementError },
    { name: "keeps photo wall moderation error contract", run: testPhotoWallModerationError },
    {
      name: "matches gift catalog item response shape with application contract",
      run: testGiftCatalogItemResponseContractMatchesApplicationShape,
    },
  ]);
}
