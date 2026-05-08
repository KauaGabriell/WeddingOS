import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import {
  AdminUserRole,
  AdminUserStatus,
  AuditLogActorType,
  EventType,
  GiftReservationStatus,
  GiftStatus,
  GuestStatus,
  InviteTokenChannel,
  InviteTokenStatus,
  PhotoPostModerationStatus,
  RsvpResponseStatus,
} from "../generated/prisma/enums.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(currentDir, "../../.env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured. Set apps/api/.env before running the seed.");
}

const ids = {
  adminUser: "9f85fe42-0c47-45d4-b9a3-3f4141c0c100",
  coupleAdminUser: "9f85fe42-0c47-45d4-b9a3-3f4141c0c101",
  guestGroup: "9f85fe42-0c47-45d4-b9a3-3f4141c0c200",
  primaryGuest: "9f85fe42-0c47-45d4-b9a3-3f4141c0c210",
  secondaryGuest: "9f85fe42-0c47-45d4-b9a3-3f4141c0c211",
  linkInviteToken: "9f85fe42-0c47-45d4-b9a3-3f4141c0c300",
  codeInviteToken: "9f85fe42-0c47-45d4-b9a3-3f4141c0c301",
  bridalShowerEvent: "9f85fe42-0c47-45d4-b9a3-3f4141c0c400",
  weddingEvent: "9f85fe42-0c47-45d4-b9a3-3f4141c0c401",
  bridalShowerEligibility: "9f85fe42-0c47-45d4-b9a3-3f4141c0c500",
  weddingEligibility: "9f85fe42-0c47-45d4-b9a3-3f4141c0c501",
  secondaryBridalShowerEligibility: "9f85fe42-0c47-45d4-b9a3-3f4141c0c502",
  secondaryWeddingEligibility: "9f85fe42-0c47-45d4-b9a3-3f4141c0c503",
  bridalShowerRsvp: "9f85fe42-0c47-45d4-b9a3-3f4141c0c600",
  giftOne: "9f85fe42-0c47-45d4-b9a3-3f4141c0c700",
  giftTwo: "9f85fe42-0c47-45d4-b9a3-3f4141c0c701",
  giftThree: "9f85fe42-0c47-45d4-b9a3-3f4141c0c702",
  giftFour: "9f85fe42-0c47-45d4-b9a3-3f4141c0c703",
  activeReservation: "9f85fe42-0c47-45d4-b9a3-3f4141c0c800",
  approvedPhotoPost: "9f85fe42-0c47-45d4-b9a3-3f4141c0c900",
  pendingPhotoPost: "9f85fe42-0c47-45d4-b9a3-3f4141c0c901",
  auditLog: "9f85fe42-0c47-45d4-b9a3-3f4141c0ca00",
} as const;

const fixtures = {
  guestAccessToken: "guest-link-alice-bruno-2026",
  guestAccessCode: "WOSIGOR2026",
  adminEmail: "admin@weddingos.local",
  coupleAdminEmail: "noivos@admin",
};

const linkInviteIssuedAt = new Date();
const codeInviteIssuedAt = new Date(linkInviteIssuedAt.getTime() + 1_000);

function createPrismaClient() {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  return {
    prisma: new PrismaClient({
      adapter: new PrismaPg(pool),
    }),
    pool,
  };
}

async function seed(): Promise<void> {
  const { prisma, pool } = createPrismaClient();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.adminUser.upsert({
        where: { id: ids.adminUser },
        update: {
          name: "Alice Cerimonial",
          email: fixtures.adminEmail,
          authProvider: "magic_link",
          role: AdminUserRole.SUPER_ADMIN,
          status: AdminUserStatus.ACTIVE,
          lastLoginAt: null,
        },
        create: {
          id: ids.adminUser,
          name: "Alice Cerimonial",
          email: fixtures.adminEmail,
          authProvider: "magic_link",
          role: AdminUserRole.SUPER_ADMIN,
          status: AdminUserStatus.ACTIVE,
        },
      });

      await tx.adminUser.upsert({
        where: { id: ids.coupleAdminUser },
        update: {
          name: "Ygor e Amanda",
          email: fixtures.coupleAdminEmail,
          authProvider: "fixed_code",
          role: AdminUserRole.SUPER_ADMIN,
          status: AdminUserStatus.ACTIVE,
          lastLoginAt: null,
        },
        create: {
          id: ids.coupleAdminUser,
          name: "Ygor e Amanda",
          email: fixtures.coupleAdminEmail,
          authProvider: "fixed_code",
          role: AdminUserRole.SUPER_ADMIN,
          status: AdminUserStatus.ACTIVE,
        },
      });

      await tx.guestGroup.upsert({
        where: { id: ids.guestGroup },
        update: {
          displayName: "Igor & Amanda",
          groupCode: "IGOR-AMANDA",
          allowedCompanions: 2,
          primaryContactName: "Igor Vasconcelos",
          primaryContactPhone: "+55 62 99999-1000",
          primaryContactEmail: "igor@example.com",
          notes: "Convite seed para validar o fluxo completo do convidado.",
        },
        create: {
          id: ids.guestGroup,
          displayName: "Igor & Amanda",
          groupCode: "IGOR-AMANDA",
          allowedCompanions: 2,
          primaryContactName: "Igor Vasconcelos",
          primaryContactPhone: "+55 62 99999-1000",
          primaryContactEmail: "igor@example.com",
          notes: "Convite seed para validar o fluxo completo do convidado.",
        },
      });

      await tx.guest.upsert({
        where: { id: ids.primaryGuest },
        update: {
          guestGroupId: ids.guestGroup,
          fullName: "Igor Vasconcelos",
          phone: "+55 62 99999-1000",
          email: "igor@example.com",
          isPrimary: true,
          status: GuestStatus.ACTIVE,
          lastAccessAt: null,
        },
        create: {
          id: ids.primaryGuest,
          guestGroupId: ids.guestGroup,
          fullName: "Igor Vasconcelos",
          phone: "+55 62 99999-1000",
          email: "igor@example.com",
          isPrimary: true,
          status: GuestStatus.ACTIVE,
        },
      });

      await tx.guest.upsert({
        where: { id: ids.secondaryGuest },
        update: {
          guestGroupId: ids.guestGroup,
          fullName: "Amanda Silva",
          phone: "+55 62 99999-1001",
          email: "amanda@example.com",
          isPrimary: false,
          status: GuestStatus.ACTIVE,
          lastAccessAt: null,
        },
        create: {
          id: ids.secondaryGuest,
          guestGroupId: ids.guestGroup,
          fullName: "Amanda Silva",
          phone: "+55 62 99999-1001",
          email: "amanda@example.com",
          isPrimary: false,
          status: GuestStatus.ACTIVE,
        },
      });

      await tx.inviteToken.upsert({
        where: { id: ids.linkInviteToken },
        update: {
          guestGroupId: null,
          guestId: ids.primaryGuest,
          tokenHash: fixtures.guestAccessToken,
          shortCode: null,
          channel: InviteTokenChannel.WHATSAPP,
          status: InviteTokenStatus.ISSUED,
          issuedAt: linkInviteIssuedAt,
          expiresAt: new Date("2026-12-31T23:59:59.000-03:00"),
          usedAt: null,
          revokedAt: null,
          revokedReason: null,
          createdAt: linkInviteIssuedAt,
          updatedAt: linkInviteIssuedAt,
        },
        create: {
          id: ids.linkInviteToken,
          guestGroupId: null,
          guestId: ids.primaryGuest,
          tokenHash: fixtures.guestAccessToken,
          shortCode: null,
          channel: InviteTokenChannel.WHATSAPP,
          status: InviteTokenStatus.ISSUED,
          issuedAt: linkInviteIssuedAt,
          expiresAt: new Date("2026-12-31T23:59:59.000-03:00"),
          createdAt: linkInviteIssuedAt,
          updatedAt: linkInviteIssuedAt,
        },
      });

      await tx.inviteToken.upsert({
        where: { id: ids.codeInviteToken },
        update: {
          guestGroupId: null,
          guestId: ids.primaryGuest,
          tokenHash: "guest-code-alice-bruno-2026",
          shortCode: fixtures.guestAccessCode,
          channel: InviteTokenChannel.MANUAL,
          status: InviteTokenStatus.ISSUED,
          issuedAt: codeInviteIssuedAt,
          expiresAt: new Date("2026-12-31T23:59:59.000-03:00"),
          usedAt: null,
          revokedAt: null,
          revokedReason: null,
          createdAt: codeInviteIssuedAt,
          updatedAt: codeInviteIssuedAt,
        },
        create: {
          id: ids.codeInviteToken,
          guestGroupId: null,
          guestId: ids.primaryGuest,
          tokenHash: "guest-code-alice-bruno-2026",
          shortCode: fixtures.guestAccessCode,
          channel: InviteTokenChannel.MANUAL,
          status: InviteTokenStatus.ISSUED,
          issuedAt: codeInviteIssuedAt,
          expiresAt: new Date("2026-12-31T23:59:59.000-03:00"),
          createdAt: codeInviteIssuedAt,
          updatedAt: codeInviteIssuedAt,
        },
      });

      await tx.event.upsert({
        where: { id: ids.bridalShowerEvent },
        update: {
          slug: "cha-de-panela",
          name: "Cha de Panela",
          eventType: EventType.BRIDAL_SHOWER,
          startsAt: new Date("2026-06-06T18:30:00.000-03:00"),
          venueName: "Espaco Kaun",
          addressLine: "Rua 2, Parque dos Pirineus",
          addressNumber: null,
          neighborhood: "Parque dos Pirineus",
          city: "Aparecida de Goiania",
          state: "GO",
          postalCode: null,
          latitude: null,
          longitude: null,
          mapUrl: "https://maps.google.com/?q=Espaco+Kaun+Parque+dos+Pirineus",
          notes: "Chegue com 15 minutos de antecedencia.",
          isActive: true,
        },
        create: {
          id: ids.bridalShowerEvent,
          slug: "cha-de-panela",
          name: "Cha de Panela",
          eventType: EventType.BRIDAL_SHOWER,
          startsAt: new Date("2026-06-06T18:30:00.000-03:00"),
          venueName: "Espaco Kaun",
          addressLine: "Rua 2, Parque dos Pirineus",
          addressNumber: null,
          neighborhood: "Parque dos Pirineus",
          city: "Aparecida de Goiania",
          state: "GO",
          postalCode: null,
          mapUrl: "https://maps.google.com/?q=Espaco+Kaun+Parque+dos+Pirineus",
          notes: "Chegue com 15 minutos de antecedencia.",
          isActive: true,
        },
      });

      await tx.event.upsert({
        where: { id: ids.weddingEvent },
        update: {
          slug: "casamento",
          name: "Casamento",
          eventType: EventType.WEDDING,
          startsAt: new Date("2026-09-05T16:00:00.000-03:00"),
          venueName: "Local a confirmar",
          addressLine: "A confirmar",
          addressNumber: null,
          neighborhood: null,
          city: "A definir",
          state: "GO",
          postalCode: null,
          latitude: null,
          longitude: null,
          mapUrl: null,
          notes: "Em breve compartilharemos o local oficial.",
          isActive: true,
        },
        create: {
          id: ids.weddingEvent,
          slug: "casamento",
          name: "Casamento",
          eventType: EventType.WEDDING,
          startsAt: new Date("2026-09-05T16:00:00.000-03:00"),
          venueName: "Local a confirmar",
          addressLine: "A confirmar",
          addressNumber: null,
          neighborhood: null,
          city: "A definir",
          state: "GO",
          postalCode: null,
          mapUrl: null,
          notes: "Em breve compartilharemos o local oficial.",
          isActive: true,
        },
      });

      const eligibilitySeeds = [
        {
          id: ids.bridalShowerEligibility,
          eventId: ids.bridalShowerEvent,
          guestId: ids.primaryGuest,
        },
        {
          id: ids.weddingEligibility,
          eventId: ids.weddingEvent,
          guestId: ids.primaryGuest,
        },
        {
          id: ids.secondaryBridalShowerEligibility,
          eventId: ids.bridalShowerEvent,
          guestId: ids.secondaryGuest,
        },
        {
          id: ids.secondaryWeddingEligibility,
          eventId: ids.weddingEvent,
          guestId: ids.secondaryGuest,
        },
      ] as const;

      for (const eligibility of eligibilitySeeds) {
        await tx.eventGuestEligibility.upsert({
          where: { id: eligibility.id },
          update: {
            eventId: eligibility.eventId,
            guestId: eligibility.guestId,
            canRsvp: true,
          },
          create: {
            id: eligibility.id,
            eventId: eligibility.eventId,
            guestId: eligibility.guestId,
            canRsvp: true,
          },
        });
      }

      await tx.rsvpResponse.upsert({
        where: { id: ids.bridalShowerRsvp },
        update: {
          eventId: ids.bridalShowerEvent,
          guestId: ids.primaryGuest,
          responseStatus: RsvpResponseStatus.YES,
          companionsConfirmed: 1,
          message: "Vamos com alegria.",
          respondedAt: new Date("2026-05-07T10:00:00.000-03:00"),
        },
        create: {
          id: ids.bridalShowerRsvp,
          eventId: ids.bridalShowerEvent,
          guestId: ids.primaryGuest,
          responseStatus: RsvpResponseStatus.YES,
          companionsConfirmed: 1,
          message: "Vamos com alegria.",
          respondedAt: new Date("2026-05-07T10:00:00.000-03:00"),
        },
      });

      const giftSeeds = [
        {
          id: ids.giftOne,
          name: "Jogo de Lencois 1000 Fios",
          category: "Quarto",
          description: "Opcao premium para montar a nova casa.",
          estimatedValue: "1200.00",
          displayOrder: 1,
          status: GiftStatus.AVAILABLE,
          isActive: true,
        },
        {
          id: ids.giftTwo,
          name: "Relogio Minimalista Rose",
          category: "Decoracao",
          description: "Peca para a sala principal.",
          estimatedValue: "450.00",
          displayOrder: 2,
          status: GiftStatus.AVAILABLE,
          isActive: true,
        },
        {
          id: ids.giftThree,
          name: "Jantar em Paris",
          category: "Lua de mel",
          description: "Experiencia especial para a viagem.",
          estimatedValue: "2500.00",
          displayOrder: 3,
          status: GiftStatus.AVAILABLE,
          isActive: true,
        },
        {
          id: ids.giftFour,
          name: "Adega Compacta",
          category: "Cozinha",
          description: "Item arquivado para fluxo administrativo.",
          estimatedValue: "980.00",
          displayOrder: 4,
          status: GiftStatus.ARCHIVED,
          isActive: false,
        },
      ] as const;

      for (const gift of giftSeeds) {
        await tx.gift.upsert({
          where: { id: gift.id },
          update: gift,
          create: gift,
        });
      }

      await tx.giftReservation.upsert({
        where: { id: ids.activeReservation },
        update: {
          giftId: ids.giftThree,
          guestId: ids.primaryGuest,
          reservationStatus: GiftReservationStatus.ACTIVE,
          purchaseNotes: "Vamos contribuir com parte da experiencia.",
          reservedAt: new Date("2026-05-07T10:30:00.000-03:00"),
          releasedAt: null,
          releasedByAdminUserId: null,
        },
        create: {
          id: ids.activeReservation,
          giftId: ids.giftThree,
          guestId: ids.primaryGuest,
          reservationStatus: GiftReservationStatus.ACTIVE,
          purchaseNotes: "Vamos contribuir com parte da experiencia.",
          reservedAt: new Date("2026-05-07T10:30:00.000-03:00"),
          releasedAt: null,
          releasedByAdminUserId: null,
        },
      });

      await tx.photoPost.upsert({
        where: { id: ids.approvedPhotoPost },
        update: {
          guestId: ids.primaryGuest,
          authorName: "Igor Vasconcelos",
          message: "Animados para celebrar esse dia com voces.",
          mediaStorageKey: "seed/photo-wall/approved-igor.jpg",
          mediaUrl: null,
          mediaMimeType: "image/jpeg",
          mediaSizeBytes: 182341,
          mediaWidth: 1080,
          mediaHeight: 1350,
          moderationStatus: PhotoPostModerationStatus.APPROVED,
          submittedAt: new Date("2026-05-01T14:00:00.000-03:00"),
          approvedAt: new Date("2026-05-01T15:00:00.000-03:00"),
          hiddenAt: null,
          moderatedByAdminUserId: ids.adminUser,
        },
        create: {
          id: ids.approvedPhotoPost,
          guestId: ids.primaryGuest,
          authorName: "Igor Vasconcelos",
          message: "Animados para celebrar esse dia com voces.",
          mediaStorageKey: "seed/photo-wall/approved-igor.jpg",
          mediaUrl: null,
          mediaMimeType: "image/jpeg",
          mediaSizeBytes: 182341,
          mediaWidth: 1080,
          mediaHeight: 1350,
          moderationStatus: PhotoPostModerationStatus.APPROVED,
          submittedAt: new Date("2026-05-01T14:00:00.000-03:00"),
          approvedAt: new Date("2026-05-01T15:00:00.000-03:00"),
          hiddenAt: null,
          moderatedByAdminUserId: ids.adminUser,
        },
      });

      await tx.photoPost.upsert({
        where: { id: ids.pendingPhotoPost },
        update: {
          guestId: ids.secondaryGuest,
          authorName: "Amanda Silva",
          message: "Contando os dias para o grande momento.",
          mediaStorageKey: "seed/photo-wall/pending-amanda.jpg",
          mediaUrl: null,
          mediaMimeType: "image/jpeg",
          mediaSizeBytes: 165004,
          mediaWidth: 1080,
          mediaHeight: 1080,
          moderationStatus: PhotoPostModerationStatus.PENDING,
          submittedAt: new Date("2026-05-02T12:00:00.000-03:00"),
          approvedAt: null,
          hiddenAt: null,
          moderatedByAdminUserId: null,
        },
        create: {
          id: ids.pendingPhotoPost,
          guestId: ids.secondaryGuest,
          authorName: "Amanda Silva",
          message: "Contando os dias para o grande momento.",
          mediaStorageKey: "seed/photo-wall/pending-amanda.jpg",
          mediaUrl: null,
          mediaMimeType: "image/jpeg",
          mediaSizeBytes: 165004,
          mediaWidth: 1080,
          mediaHeight: 1080,
          moderationStatus: PhotoPostModerationStatus.PENDING,
          submittedAt: new Date("2026-05-02T12:00:00.000-03:00"),
        },
      });

      await tx.auditLog.upsert({
        where: { id: ids.auditLog },
        update: {
          entityType: "seed",
          entityId: ids.primaryGuest,
          actionType: "SEED_REFRESHED",
          actorType: AuditLogActorType.SYSTEM,
          actorAdminUserId: null,
          actorGuestId: null,
          requestId: "seed-script",
          metadata: {
            seededAt: new Date().toISOString(),
            source: "apps/api/src/scripts/seed.ts",
          },
        },
        create: {
          id: ids.auditLog,
          entityType: "seed",
          entityId: ids.primaryGuest,
          actionType: "SEED_REFRESHED",
          actorType: AuditLogActorType.SYSTEM,
          requestId: "seed-script",
          metadata: {
            source: "apps/api/src/scripts/seed.ts",
          },
        },
      });
    });

    console.log("");
    console.log("Seed concluida.");
    console.log(`API health: http://localhost:3001/health`);
    console.log(`Guest login by code: ${fixtures.guestAccessCode}`);
    console.log(`Guest login by token: ${fixtures.guestAccessToken}`);
    console.log(`Admin email: ${fixtures.adminEmail}`);
    console.log("Observacao: os invite tokens sao consumiveis. Rode a seed novamente se quiser resetar o login.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void seed().catch((error) => {
  console.error("Falha ao executar a seed.");
  console.error(error);
  process.exit(1);
});
