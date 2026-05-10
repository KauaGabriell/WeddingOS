import assert from "node:assert/strict";
import type {
  Event as PrismaEventRecord,
  EventGuestEligibility as PrismaEventGuestEligibilityRecord,
  Guest as PrismaGuestRecord,
  GuestGroup as PrismaGuestGroupRecord,
  RsvpResponse as PrismaRsvpResponseRecord,
} from "../../generated/prisma/client.js";
import {
  PrismaEventGuestEligibilityRepository,
  PrismaEventRepository,
  PrismaGuestGroupRepository,
  PrismaGuestRepository,
  PrismaRsvpResponseRepository,
} from "../../modules/guests-rsvp/index.js";
import { runNamedTests } from "../test-helpers.js";

async function testPrismaGuestRepository(): Promise<void> {
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
    async findFirst(args: { where: { guestGroupId: string; isPrimary?: boolean }; orderBy: { createdAt: "asc" | "desc" } }) {
      calls.push({ method: "findFirst", args });
      return persistenceRecord;
    },
    async findMany(args: any) {
      calls.push({ method: "findMany", args });
      return [persistenceRecord];
    },
    async upsert(args: any) {
      calls.push({ method: "upsert", args });
      return { ...persistenceRecord, ...args.update };
    },
  };
  const repository = new PrismaGuestRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaGuestRepository>[0],
  );
  assert.equal((await repository.findById("guest-rsvp-1"))?.status, "active");
  assert.equal((await repository.findPrimaryByGroupId("group-1"))?.isPrimary, true);
  assert.equal((await repository.findMany({ page: 2, pageSize: 10, guestGroupId: "group-1", status: "active", search: "ana" })).length, 1);
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
  const delegate = {
    async findUnique() {
      return persistenceRecord;
    },
    async findMany() {
      return [persistenceRecord];
    },
    async upsert(args: any) {
      return { ...persistenceRecord, ...args.update };
    },
  };
  const repository = new PrismaGuestGroupRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaGuestGroupRepository>[0],
  );
  assert.equal((await repository.findById("group-1"))?.groupCode, "SOUZA01");
  assert.equal((await repository.findByGroupCode("SOUZA01"))?.id, "group-1");
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
    mapUrl: null,
    notes: null,
    isActive: true,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };
  const delegate = {
    async findUnique() {
      return persistenceRecord;
    },
    async findMany() {
      return [persistenceRecord];
    },
    async upsert(args: any) {
      return { ...persistenceRecord, ...args.update };
    },
  };
  const repository = new PrismaEventRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaEventRepository>[0],
  );
  assert.equal((await repository.findBySlug("casamento"))?.slug, "casamento");
  assert.equal((await repository.findById("event-1"))?.location.latitude, -23.55052);
}

async function testPrismaEventGuestEligibilityRepository(): Promise<void> {
  const persistenceRecord: PrismaEventGuestEligibilityRecord = {
    id: "eligibility-1",
    eventId: "event-1",
    guestId: "guest-1",
    canRsvp: true,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
  };
  const delegate = {
    async findUnique() {
      return persistenceRecord;
    },
    async findFirst() {
      return persistenceRecord;
    },
    async findMany() {
      return [persistenceRecord];
    },
    async upsert(args: any) {
      return { ...persistenceRecord, ...args.update };
    },
  };
  const repository = new PrismaEventGuestEligibilityRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaEventGuestEligibilityRepository>[0],
  );
  assert.equal((await repository.findById("eligibility-1"))?.canRsvp, true);
  assert.equal((await repository.findByEventIdAndGuestId("event-1", "guest-1"))?.eventId, "event-1");
}

async function testPrismaRsvpResponseRepository(): Promise<void> {
  const persistenceRecord: PrismaRsvpResponseRecord = {
    id: "rsvp-1",
    eventId: "event-1",
    guestId: "guest-1",
    responseStatus: "YES",
    companionsConfirmed: 2,
    message: "confirmado",
    respondedAt: new Date("2026-05-01T10:00:00.000Z"),
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  };
  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: any) {
      calls.push({ method: "findUnique", args });
      return persistenceRecord;
    },
    async findFirst(args: any) {
      calls.push({ method: "findFirst", args });
      return persistenceRecord;
    },
    async findMany(args: any) {
      calls.push({ method: "findMany", args });
      return [persistenceRecord];
    },
    async upsert(args: any) {
      calls.push({ method: "upsert", args });
      return { ...persistenceRecord, ...args.update };
    },
    async create(args: any) {
      calls.push({ method: "create", args });
      return { ...persistenceRecord, ...args.data, createdAt: new Date("2026-05-01T10:00:00.000Z"), updatedAt: new Date("2026-05-01T10:00:00.000Z") } as PrismaRsvpResponseRecord;
    },
    async update(args: any) {
      calls.push({ method: "update", args });
      return { ...persistenceRecord, ...args.data, updatedAt: new Date("2026-05-02T10:00:00.000Z") } as PrismaRsvpResponseRecord;
    },
  };
  const repository = new PrismaRsvpResponseRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaRsvpResponseRepository>[0],
  );
  assert.equal((await repository.findById("rsvp-1"))?.responseStatus, "yes");
  assert.equal((await repository.findByEventIdAndGuestId("event-1", "guest-1"))?.companionsConfirmed, 2);
  assert.equal((await repository.findMany({ page: 1, pageSize: 15, eventId: "event-1", guestId: "guest-1", responseStatus: "yes" })).length, 1);
  assert.equal((await repository.createResponse({ eventId: "event-2", guestId: "guest-2", responseStatus: "no", companionsConfirmed: 0, message: "   sem acompanhantes   " })).message, "sem acompanhantes");
}

export async function runGuestsRsvpInfrastructureTests(): Promise<void> {
  await runNamedTests("guests-rsvp/infrastructure", [
    { name: "prisma guest repository", run: testPrismaGuestRepository },
    { name: "prisma guest group repository", run: testPrismaGuestGroupRepository },
    { name: "prisma event repository", run: testPrismaEventRepository },
    { name: "prisma event guest eligibility repository", run: testPrismaEventGuestEligibilityRepository },
    { name: "prisma rsvp response repository", run: testPrismaRsvpResponseRepository },
  ]);
}
