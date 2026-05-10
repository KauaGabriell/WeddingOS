-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminUserRole" AS ENUM ('super_admin', 'editor');

-- CreateEnum
CREATE TYPE "AdminUserStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "InviteTokenChannel" AS ENUM ('whatsapp', 'email', 'manual');

-- CreateEnum
CREATE TYPE "InviteTokenStatus" AS ENUM ('issued', 'used', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('bridal_shower', 'wedding');

-- CreateEnum
CREATE TYPE "RsvpResponseStatus" AS ENUM ('yes', 'no', 'pending');

-- CreateEnum
CREATE TYPE "GiftStatus" AS ENUM ('available', 'reserved', 'archived');

-- CreateEnum
CREATE TYPE "GiftReservationStatus" AS ENUM ('active', 'released', 'cancelled');

-- CreateEnum
CREATE TYPE "PhotoPostModerationStatus" AS ENUM ('pending', 'approved', 'hidden', 'removed');

-- CreateEnum
CREATE TYPE "AuditLogActorType" AS ENUM ('admin', 'guest', 'system');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authProvider" TEXT NOT NULL,
    "role" "AdminUserRole" NOT NULL DEFAULT 'super_admin',
    "status" "AdminUserStatus" NOT NULL DEFAULT 'active',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestGroup" (
    "id" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "allowedCompanions" INTEGER NOT NULL DEFAULT 0,
    "primaryContactName" TEXT,
    "primaryContactPhone" TEXT,
    "primaryContactEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" UUID NOT NULL,
    "guestGroupId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "GuestStatus" NOT NULL DEFAULT 'active',
    "lastAccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteToken" (
    "id" UUID NOT NULL,
    "guestGroupId" UUID,
    "guestId" UUID,
    "tokenHash" TEXT NOT NULL,
    "shortCode" TEXT,
    "channel" "InviteTokenChannel" NOT NULL,
    "status" "InviteTokenStatus" NOT NULL DEFAULT 'issued',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InviteToken_guest_scope_check" CHECK (
        ("guestGroupId" IS NOT NULL AND "guestId" IS NULL)
        OR ("guestGroupId" IS NULL AND "guestId" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "venueName" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "addressNumber" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "mapUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGuestEligibility" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "canRsvp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventGuestEligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RsvpResponse" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "responseStatus" "RsvpResponseStatus" NOT NULL DEFAULT 'pending',
    "companionsConfirmed" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RsvpResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "estimatedValue" DECIMAL(10,2),
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "GiftStatus" NOT NULL DEFAULT 'available',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftReservation" (
    "id" UUID NOT NULL,
    "giftId" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "reservationStatus" "GiftReservationStatus" NOT NULL DEFAULT 'active',
    "purchaseNotes" TEXT,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "releasedByAdminUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoPost" (
    "id" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "mediaStorageKey" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaMimeType" TEXT NOT NULL,
    "mediaSizeBytes" INTEGER NOT NULL,
    "mediaWidth" INTEGER,
    "mediaHeight" INTEGER,
    "moderationStatus" "PhotoPostModerationStatus" NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "moderatedByAdminUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "actionType" TEXT NOT NULL,
    "actorAdminUserId" UUID,
    "actorGuestId" UUID,
    "actorType" "AuditLogActorType" NOT NULL,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GuestGroup_groupCode_key" ON "GuestGroup"("groupCode");

-- CreateIndex
CREATE INDEX "Guest_guestGroupId_idx" ON "Guest"("guestGroupId");

-- CreateIndex
CREATE INDEX "Guest_status_idx" ON "Guest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_tokenHash_key" ON "InviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InviteToken_guestGroupId_idx" ON "InviteToken"("guestGroupId");

-- CreateIndex
CREATE INDEX "InviteToken_guestId_idx" ON "InviteToken"("guestId");

-- CreateIndex
CREATE INDEX "InviteToken_shortCode_idx" ON "InviteToken"("shortCode");

-- CreateIndex
CREATE INDEX "InviteToken_status_expiresAt_idx" ON "InviteToken"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_eventType_startsAt_idx" ON "Event"("eventType", "startsAt");

-- CreateIndex
CREATE INDEX "Event_isActive_startsAt_idx" ON "Event"("isActive", "startsAt");

-- CreateIndex
CREATE INDEX "EventGuestEligibility_guestId_idx" ON "EventGuestEligibility"("guestId");

-- CreateIndex
CREATE UNIQUE INDEX "EventGuestEligibility_eventId_guestId_key" ON "EventGuestEligibility"("eventId", "guestId");

-- CreateIndex
CREATE INDEX "RsvpResponse_guestId_idx" ON "RsvpResponse"("guestId");

-- CreateIndex
CREATE INDEX "RsvpResponse_eventId_responseStatus_idx" ON "RsvpResponse"("eventId", "responseStatus");

-- CreateIndex
CREATE UNIQUE INDEX "RsvpResponse_eventId_guestId_key" ON "RsvpResponse"("eventId", "guestId");

-- CreateIndex
CREATE INDEX "Gift_category_status_idx" ON "Gift"("category", "status");

-- CreateIndex
CREATE INDEX "Gift_isActive_displayOrder_idx" ON "Gift"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "GiftReservation_guestId_idx" ON "GiftReservation"("guestId");

-- CreateIndex
CREATE INDEX "GiftReservation_reservationStatus_reservedAt_idx" ON "GiftReservation"("reservationStatus", "reservedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GiftReservation_giftId_key" ON "GiftReservation"("giftId") WHERE ("reservationStatus" = 'active');

-- CreateIndex
CREATE INDEX "PhotoPost_guestId_idx" ON "PhotoPost"("guestId");

-- CreateIndex
CREATE INDEX "PhotoPost_moderationStatus_submittedAt_idx" ON "PhotoPost"("moderationStatus", "submittedAt");

-- CreateIndex
CREATE INDEX "PhotoPost_moderatedByAdminUserId_idx" ON "PhotoPost"("moderatedByAdminUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_createdAt_idx" ON "AuditLog"("actorType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_guestGroupId_fkey" FOREIGN KEY ("guestGroupId") REFERENCES "GuestGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_guestGroupId_fkey" FOREIGN KEY ("guestGroupId") REFERENCES "GuestGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuestEligibility" ADD CONSTRAINT "EventGuestEligibility_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGuestEligibility" ADD CONSTRAINT "EventGuestEligibility_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RsvpResponse" ADD CONSTRAINT "RsvpResponse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RsvpResponse" ADD CONSTRAINT "RsvpResponse_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftReservation" ADD CONSTRAINT "GiftReservation_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftReservation" ADD CONSTRAINT "GiftReservation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftReservation" ADD CONSTRAINT "GiftReservation_releasedByAdminUserId_fkey" FOREIGN KEY ("releasedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoPost" ADD CONSTRAINT "PhotoPost_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoPost" ADD CONSTRAINT "PhotoPost_moderatedByAdminUserId_fkey" FOREIGN KEY ("moderatedByAdminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorAdminUserId_fkey" FOREIGN KEY ("actorAdminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorGuestId_fkey" FOREIGN KEY ("actorGuestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
