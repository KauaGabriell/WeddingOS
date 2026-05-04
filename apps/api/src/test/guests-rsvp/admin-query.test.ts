import assert from "node:assert/strict";
import type {
  EventGuestEligibility,
  Guest,
  GuestGroup,
  ListAdminGuestsAndRsvpsInput,
  GuestRepositoryFilters,
  EventGuestEligibilityRepositoryFilters,
  RsvpResponse,
  RsvpResponseRepositoryFilters,
} from "../../modules/guests-rsvp/index.js";
import {
  PrismaEventGuestEligibilityRepository,
  PrismaGuestRepository,
  PrismaRsvpResponseRepository,
  GuestsRsvpApplicationError,
  createListAdminGuestsAndRsvpsUseCase,
} from "../../modules/guests-rsvp/index.js";
import { runNamedTests } from "../test-helpers.js";

function createGuestFixtures(): {
  guestGroup: GuestGroup;
  activeGuest: Guest;
  eligibility: EventGuestEligibility;
  response: RsvpResponse;
} {
  const guestGroup: GuestGroup = {
    id: "group-1",
    displayName: "Familia Lima",
    groupCode: "LIMA01",
    allowedCompanions: 2,
    primaryContactName: "Maria Lima",
    primaryContactPhone: "11999990000",
    primaryContactEmail: "maria@example.com",
    notes: null,
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
  };
  const activeGuest: Guest = {
    id: "guest-1",
    guestGroupId: guestGroup.id,
    fullName: "Maria Lima",
    phone: "11999990000",
    email: "maria@example.com",
    isPrimary: true,
    status: "active",
    lastAccessAt: null,
    createdAt: new Date("2026-04-02T10:00:00.000Z"),
    updatedAt: new Date("2026-04-02T10:00:00.000Z"),
  };
  const eligibility: EventGuestEligibility = {
    id: "eligibility-1",
    eventId: "event-1",
    guestId: activeGuest.id,
    canRsvp: true,
    createdAt: new Date("2026-04-03T10:00:00.000Z"),
  };
  const response: RsvpResponse = {
    id: "response-1",
    eventId: "event-1",
    guestId: activeGuest.id,
    responseStatus: "yes",
    companionsConfirmed: 1,
    message: "Confirmado",
    respondedAt: new Date("2026-04-04T10:00:00.000Z"),
    createdAt: new Date("2026-04-04T10:00:00.000Z"),
    updatedAt: new Date("2026-04-04T10:00:00.000Z"),
  };

  return { guestGroup, activeGuest, eligibility, response };
}

function testGuestsRsvpAdminQueryContracts(): void {
  const example: ListAdminGuestsAndRsvpsInput = {
    eventId: "9dcb8aa4-7fd9-44ca-a3a7-0c0a7f0360af",
    guestGroupId: "a0d868f2-36f7-4136-8a23-a825f53e8fb0",
    guestStatus: "active",
    responseStatus: "yes",
    search: "maria",
    page: 2,
    pageSize: 10,
  };

  assert.equal(example.pageSize, 10);
}

async function testPrismaGuestRepositoryFiltersByEventId(): Promise<void> {
  const calls: Array<{ method: string; args: any }> = [];
  const delegate = {
    async findUnique() {
      return null;
    },
    async findFirst() {
      return null;
    },
    async findMany(args: any) {
      calls.push({ method: "findMany", args });
      return [];
    },
    async upsert() {
      throw new Error("not implemented");
    },
  };

  const repository = new PrismaGuestRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaGuestRepository>[0],
  );

  await repository.findMany({ eventId: "event-1", page: 1, pageSize: 20 });

  assert.equal(calls[0]?.args.where.eventEligibilities.some.eventId, "event-1");
}

async function testPrismaEventGuestEligibilityRepositoryFiltersByGuestIds(): Promise<void> {
  const calls: Array<{ method: string; args: any }> = [];
  const delegate = {
    async findUnique() {
      return null;
    },
    async findMany(args: any) {
      calls.push({ method: "findMany", args });
      return [];
    },
    async upsert() {
      throw new Error("not implemented");
    },
  };

  const repository = new PrismaEventGuestEligibilityRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaEventGuestEligibilityRepository>[0],
  );

  await repository.findMany({
    eventId: "event-1",
    guestIds: ["guest-1", "guest-2"],
    page: 1,
    pageSize: 20,
  });

  assert.deepEqual(calls[0]?.args.where.guestId.in, ["guest-1", "guest-2"]);
}

async function testPrismaRsvpResponseRepositoryFiltersByGuestGroupAndSearch(): Promise<void> {
  const calls: Array<{ method: string; args: any }> = [];
  const delegate = {
    async findUnique() {
      return null;
    },
    async findMany(args: any) {
      calls.push({ method: "findMany", args });
      return [];
    },
    async upsert() {
      throw new Error("not implemented");
    },
    async create() {
      throw new Error("not implemented");
    },
    async update() {
      throw new Error("not implemented");
    },
  };

  const repository = new PrismaRsvpResponseRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaRsvpResponseRepository>[0],
  );

  await repository.findMany({
    guestGroupId: "group-1",
    search: "joao",
    page: 1,
    pageSize: 20,
  });

  assert.equal(calls[0]?.args.where.guest.guestGroupId, "group-1");
  assert.equal(calls[0]?.args.where.guest.OR[0].fullName.contains, "joao");
}

async function testPrismaRsvpResponseRepositoryFiltersByGuestIds(): Promise<void> {
  const calls: Array<{ method: string; args: any }> = [];
  const delegate = {
    async findUnique() {
      return null;
    },
    async findMany(args: any) {
      calls.push({ method: "findMany", args });
      return [];
    },
    async upsert() {
      throw new Error("not implemented");
    },
    async create() {
      throw new Error("not implemented");
    },
    async update() {
      throw new Error("not implemented");
    },
  };

  const repository = new PrismaRsvpResponseRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaRsvpResponseRepository>[0],
  );

  await repository.findMany({
    guestIds: ["guest-1", "guest-2"],
    page: 1,
    pageSize: 20,
  });

  assert.deepEqual(calls[0]?.args.where.guestId.in, ["guest-1", "guest-2"]);
}

async function testListAdminGuestsAndRsvpsReturnsMergedRows(): Promise<void> {
  const { guestGroup, activeGuest, eligibility, response } = createGuestFixtures();
  const useCase = createListAdminGuestsAndRsvpsUseCase({
    guestRepository: {
      async findMany(filter: GuestRepositoryFilters) {
        assert.equal(filter.guestGroupId, guestGroup.id);
        return [activeGuest];
      },
    },
    guestGroupRepository: {
      async findById(id: string) {
        return id === guestGroup.id ? guestGroup : null;
      },
    },
    eventGuestEligibilityRepository: {
      async findMany(filter: EventGuestEligibilityRepositoryFilters) {
        assert.equal(filter.eventId, "event-1");
        return [eligibility];
      },
    },
    rsvpResponseRepository: {
      async findMany(filter: RsvpResponseRepositoryFilters) {
        assert.equal(filter.responseStatus, "yes");
        return [response];
      },
    },
  });

  const result = await useCase.execute({
    eventId: "event-1",
    guestGroupId: guestGroup.id,
    responseStatus: "yes",
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.guest.id, activeGuest.id);
  assert.equal(result.items[0]?.guestGroup.id, guestGroup.id);
  assert.equal(result.items[0]?.responses[0]?.id, response.id);
  assert.equal(result.items[0]?.eligibility[0]?.id, eligibility.id);
}

async function testListAdminGuestsAndRsvpsScopesRelatedQueriesToCurrentPageGuestIds(): Promise<void> {
  const base = createGuestFixtures();
  const secondGuest: Guest = {
    ...base.activeGuest,
    id: "guest-2",
    fullName: "Carlos Lima",
    email: "carlos@example.com",
    isPrimary: false,
  };
  const secondEligibility: EventGuestEligibility = {
    ...base.eligibility,
    id: "eligibility-2",
    guestId: secondGuest.id,
  };
  const secondResponse: RsvpResponse = {
    ...base.response,
    id: "response-2",
    guestId: secondGuest.id,
  };
  const selectedGuestIds = [base.activeGuest.id, secondGuest.id];

  const useCase = createListAdminGuestsAndRsvpsUseCase({
    guestRepository: {
      async findMany() {
        return [base.activeGuest, secondGuest];
      },
    },
    guestGroupRepository: {
      async findById(id: string) {
        return id === base.guestGroup.id ? base.guestGroup : null;
      },
    },
    eventGuestEligibilityRepository: {
      async findMany(filter: EventGuestEligibilityRepositoryFilters) {
        assert.deepEqual(filter.guestIds, selectedGuestIds);
        return [base.eligibility, secondEligibility];
      },
    },
    rsvpResponseRepository: {
      async findMany(filter: RsvpResponseRepositoryFilters) {
        assert.deepEqual(filter.guestIds, selectedGuestIds);
        return [base.response, secondResponse];
      },
    },
  });

  const result = await useCase.execute({
    eventId: "event-1",
    page: 1,
    pageSize: 2,
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.eligibility.length, 1);
  assert.equal(result.items[1]?.eligibility[0]?.guestId, secondGuest.id);
  assert.equal(result.items[0]?.responses.length, 1);
  assert.equal(result.items[1]?.responses[0]?.guestId, secondGuest.id);
}

async function testListAdminGuestsAndRsvpsRejectsMissingGuestGroup(): Promise<void> {
  const { activeGuest } = createGuestFixtures();
  const useCase = createListAdminGuestsAndRsvpsUseCase({
    guestRepository: {
      async findMany() {
        return [activeGuest];
      },
    },
    guestGroupRepository: {
      async findById() {
        return null;
      },
    },
    eventGuestEligibilityRepository: {
      async findMany() {
        return [];
      },
    },
    rsvpResponseRepository: {
      async findMany() {
        return [];
      },
    },
  });

  await assert.rejects(
    () => useCase.execute({}),
    (error: unknown) =>
      error instanceof GuestsRsvpApplicationError && error.reason === "guest_group_not_found",
  );
}

export async function runGuestsRsvpAdminQueryTests(): Promise<void> {
  await runNamedTests("guests-rsvp/admin-query", [
    { name: "exports admin query contracts", run: testGuestsRsvpAdminQueryContracts },
    { name: "filters guests by event id in prisma repository", run: testPrismaGuestRepositoryFiltersByEventId },
    {
      name: "filters event guest eligibilities by guest ids in prisma repository",
      run: testPrismaEventGuestEligibilityRepositoryFiltersByGuestIds,
    },
    {
      name: "filters rsvp responses by guest group and search in prisma repository",
      run: testPrismaRsvpResponseRepositoryFiltersByGuestGroupAndSearch,
    },
    {
      name: "filters rsvp responses by guest ids in prisma repository",
      run: testPrismaRsvpResponseRepositoryFiltersByGuestIds,
    },
    { name: "lists merged admin guest rows", run: testListAdminGuestsAndRsvpsReturnsMergedRows },
    {
      name: "scopes related admin guest rows to current page guest ids",
      run: testListAdminGuestsAndRsvpsScopesRelatedQueriesToCurrentPageGuestIds,
    },
    {
      name: "rejects guest rows without guest group",
      run: testListAdminGuestsAndRsvpsRejectsMissingGuestGroup,
    },
  ]);
}
