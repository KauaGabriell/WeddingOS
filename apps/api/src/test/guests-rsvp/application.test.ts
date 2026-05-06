import assert from "node:assert/strict";
import type { Event, EventGuestEligibility, Guest, GuestGroup, RsvpResponse } from "../../modules/guests-rsvp/index.js";
import {
  buildRsvpResponseIdempotencyKey,
  createConfirmAttendanceUseCase,
  createDeclineAttendanceUseCase,
  createGetGuestInvitationOverviewUseCase,
  GuestsRsvpApplicationError,
} from "../../modules/guests-rsvp/index.js";
import { runNamedTests } from "../test-helpers.js";

function useCaseDependenciesGuestRepository(primaryGuest: Guest, companionGuest: Guest) {
  return {
    async findById(guestId: string) {
      if (guestId === primaryGuest.id) {
        return primaryGuest;
      }
      if (guestId === companionGuest.id) {
        return companionGuest;
      }
      return null;
    },
    async findMany() {
      return [companionGuest, primaryGuest] as const;
    },
  };
}

function testRsvpIdempotencyKeyBuilder(): void {
  assert.deepEqual(buildRsvpResponseIdempotencyKey({ eventId: "event-1", guestId: "guest-1" }), {
    eventId: "event-1",
    guestId: "guest-1",
  });
}

async function testGetGuestInvitationOverviewUseCase(): Promise<void> {
  const group: GuestGroup = {
    id: "group-1",
    displayName: "Familia Souza",
    groupCode: "SOUZA01",
    allowedCompanions: 2,
    primaryContactName: "Ana Souza",
    primaryContactPhone: "11999990000",
    primaryContactEmail: "ana@example.com",
    notes: null,
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
  };
  const primaryGuest: Guest = {
    id: "guest-1",
    guestGroupId: "group-1",
    fullName: "Ana Souza",
    phone: "11999990000",
    email: "ana@example.com",
    isPrimary: true,
    status: "active",
    lastAccessAt: null,
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
  };
  const companionGuest: Guest = {
    ...primaryGuest,
    id: "guest-2",
    fullName: "Bruno Souza",
    isPrimary: false,
    createdAt: new Date("2026-04-02T10:00:00.000Z"),
  };
  const weddingEvent: Event = {
    id: "event-1",
    slug: "casamento",
    name: "Casamento",
    eventType: "wedding",
    startsAt: new Date("2026-07-12T16:00:00.000Z"),
    location: {
      venueName: "Espaco Jardim",
      addressLine: "Rua das Flores",
      addressNumber: "100",
      neighborhood: "Centro",
      city: "Sao Paulo",
      state: "SP",
      postalCode: "01000-000",
      latitude: null,
      longitude: null,
      mapUrl: null,
    },
    notes: null,
    isActive: true,
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
  };
  const showerEvent: Event = {
    ...weddingEvent,
    id: "event-2",
    slug: "cha-bar",
    name: "Cha Bar",
    eventType: "bridal_shower",
    startsAt: new Date("2026-06-01T15:00:00.000Z"),
  };
  const eligibility: EventGuestEligibility[] = [
    { id: "eligibility-1", eventId: "event-1", guestId: "guest-1", canRsvp: true, createdAt: new Date("2026-04-05T10:00:00.000Z") },
    { id: "eligibility-2", eventId: "event-2", guestId: "guest-1", canRsvp: true, createdAt: new Date("2026-04-05T10:00:00.000Z") },
    { id: "eligibility-3", eventId: "event-1", guestId: "guest-2", canRsvp: true, createdAt: new Date("2026-04-06T10:00:00.000Z") },
  ];
  const responses: RsvpResponse[] = [
    {
      id: "rsvp-1",
      eventId: "event-1",
      guestId: "guest-1",
      responseStatus: "yes",
      companionsConfirmed: 1,
      message: "Confirmado",
      respondedAt: new Date("2026-05-01T12:00:00.000Z"),
      createdAt: new Date("2026-05-01T12:00:00.000Z"),
      updatedAt: new Date("2026-05-01T12:00:00.000Z"),
    },
    {
      id: "rsvp-2",
      eventId: "event-1",
      guestId: "guest-2",
      responseStatus: "pending",
      companionsConfirmed: 0,
      message: null,
      respondedAt: new Date("2026-05-02T12:00:00.000Z"),
      createdAt: new Date("2026-05-02T12:00:00.000Z"),
      updatedAt: new Date("2026-05-02T12:00:00.000Z"),
    },
  ];

  const useCase = createGetGuestInvitationOverviewUseCase({
    guestRepository: {
      async findById(guestId: string) {
        if (guestId === "guest-1") return primaryGuest;
        if (guestId === "guest-inactive") return { ...primaryGuest, id: guestId, status: "inactive" as const };
        return null;
      },
      async findMany(filter) {
        assert.equal(filter.guestGroupId, "group-1");
        return [companionGuest, primaryGuest];
      },
    },
    guestGroupRepository: { async findById(groupId: string) { return groupId === "group-1" ? group : null; } },
    eventRepository: {
      async findById(eventId: string) {
        if (eventId === "event-1") return weddingEvent;
        if (eventId === "event-2") return showerEvent;
        return null;
      },
    },
    eventGuestEligibilityRepository: {
      async findMany(filter) {
        return eligibility.filter((entry) => entry.guestId === filter.guestId);
      },
    },
    rsvpResponseRepository: {
      async findMany(filter) {
        return responses.filter((entry) => entry.guestId === filter.guestId);
      },
    },
  });

  const overview = await useCase.execute({ guestId: "guest-1" });
  assert.equal(overview.guestGroup.id, "group-1");
  assert.deepEqual(overview.guests.map((guest) => guest.id), ["guest-1", "guest-2"]);
  assert.deepEqual(overview.events.map((event) => event.id), ["event-2", "event-1"]);
  assert.equal(overview.eligibility.length, 3);
  assert.equal(overview.responses.length, 2);

  await assert.rejects(() => useCase.execute({ guestId: "guest-missing" }), (error: unknown) => {
    return error instanceof GuestsRsvpApplicationError && error.reason === "guest_not_found";
  });

  const missingGroupUseCase = createGetGuestInvitationOverviewUseCase({
    guestRepository: useCaseDependenciesGuestRepository(primaryGuest, companionGuest),
    guestGroupRepository: { async findById() { return null; } },
    eventRepository: { async findById() { return null; } },
    eventGuestEligibilityRepository: { async findMany() { return []; } },
    rsvpResponseRepository: { async findMany() { return []; } },
  });

  await assert.rejects(() => missingGroupUseCase.execute({ guestId: "guest-1" }), (error: unknown) => {
    return error instanceof GuestsRsvpApplicationError && error.reason === "guest_group_not_found";
  });
}

async function testConfirmAndDeclineAttendanceUseCases(): Promise<void> {
  const guest: Guest = {
    id: "guest-1",
    guestGroupId: "group-1",
    fullName: "Ana Souza",
    phone: null,
    email: "ana@example.com",
    isPrimary: true,
    status: "active",
    lastAccessAt: null,
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
  };
  const group: GuestGroup = {
    id: "group-1",
    displayName: "Familia Souza",
    groupCode: "SOUZA01",
    allowedCompanions: 1,
    primaryContactName: "Ana Souza",
    primaryContactPhone: null,
    primaryContactEmail: "ana@example.com",
    notes: null,
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
  };
  const event: Event = {
    id: "event-1",
    slug: "casamento",
    name: "Casamento",
    eventType: "wedding",
    startsAt: new Date("2026-07-12T16:00:00.000Z"),
    location: {
      venueName: "Espaco Jardim",
      addressLine: "Rua das Flores",
      addressNumber: "100",
      neighborhood: "Centro",
      city: "Sao Paulo",
      state: "SP",
      postalCode: "01000-000",
      latitude: null,
      longitude: null,
      mapUrl: null,
    },
    notes: null,
    isActive: true,
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
  };
  const eligibility: EventGuestEligibility = {
    id: "eligibility-1",
    eventId: "event-1",
    guestId: "guest-1",
    canRsvp: true,
    createdAt: new Date("2026-04-05T10:00:00.000Z"),
  };
  const existingResponse: RsvpResponse = {
    id: "rsvp-1",
    eventId: "event-1",
    guestId: "guest-1",
    responseStatus: "yes",
    companionsConfirmed: 1,
    message: "Confirmado",
    respondedAt: new Date("2026-05-01T12:00:00.000Z"),
    createdAt: new Date("2026-05-01T12:00:00.000Z"),
    updatedAt: new Date("2026-05-01T12:00:00.000Z"),
  };

  let currentResponse: RsvpResponse | null = null;
  const auditWrites: Array<Record<string, unknown>> = [];
  const sharedDependencies = {
    guestRepository: {
      async findById(guestId: string) {
        if (guestId === "guest-1") return guest;
        if (guestId === "guest-inactive") return { ...guest, id: guestId, status: "inactive" as const };
        return null;
      },
    },
    guestGroupRepository: {
      async findById(groupId: string) {
        return groupId === "group-1" ? group : null;
      },
    },
    eventRepository: {
      async findById(eventId: string) {
        if (eventId === "event-1") return event;
        if (eventId === "event-2") {
          return { ...event, id: "event-2", slug: "cha-bar", eventType: "bridal_shower" as const };
        }
        if (eventId === "event-blocked") return { ...event, id: eventId };
        return null;
      },
    },
    eventGuestEligibilityRepository: {
      async findByEventIdAndGuestId(eventId: string, guestId: string) {
        if (eventId === "event-1" && guestId === "guest-1") return eligibility;
        if (eventId === "event-blocked" && guestId === "guest-1") return { ...eligibility, eventId, canRsvp: false };
        return null;
      },
    },
    rsvpResponseTransactionRunner: {
      async runIdempotentSubmission(operation: any) {
        return operation({
          async findResponseByEventAndGuest() {
            return currentResponse;
          },
          async createResponse(input: any) {
            currentResponse = {
              id: "rsvp-created",
              eventId: input.eventId,
              guestId: input.guestId,
              responseStatus: input.responseStatus,
              companionsConfirmed: input.companionsConfirmed,
              message: input.message?.trim() ? input.message.trim() : null,
              respondedAt: new Date("2026-05-10T10:00:00.000Z"),
              createdAt: new Date("2026-05-10T10:00:00.000Z"),
              updatedAt: new Date("2026-05-10T10:00:00.000Z"),
            };
            return currentResponse;
          },
          async updateResponse(responseId: string, input: any) {
            currentResponse = {
              id: responseId,
              eventId: input.eventId,
              guestId: input.guestId,
              responseStatus: input.responseStatus,
              companionsConfirmed: input.companionsConfirmed,
              message: input.message?.trim() ? input.message.trim() : null,
              respondedAt: new Date("2026-05-11T10:00:00.000Z"),
              createdAt: existingResponse.createdAt,
              updatedAt: new Date("2026-05-11T10:00:00.000Z"),
            };
            return currentResponse;
          },
        });
      },
    },
    auditLogWriter: {
      async write(input: {
        entityType: string;
        entityId: string;
        actionType: string;
        actorType: "admin" | "guest" | "system";
        actorGuestId?: string;
        requestId?: string;
        metadata?: Record<string, unknown>;
      }) {
        auditWrites.push(input as Record<string, unknown>);
        return {
          id: `audit-${auditWrites.length}`,
          entityType: input.entityType,
          entityId: input.entityId,
          actionType: input.actionType,
          actorAdminUserId: null,
          actorGuestId: input.actorGuestId ?? null,
          actorType: input.actorType,
          requestId: input.requestId ?? null,
          metadata: input.metadata ?? null,
          createdAt: new Date("2026-05-10T10:01:00.000Z"),
        };
      },
    },
  };

  const confirmUseCase = createConfirmAttendanceUseCase(sharedDependencies);
  currentResponse = null;
  assert.equal(
    (
      await confirmUseCase.execute({
        eventId: "event-1",
        guestId: "guest-1",
        responseStatus: "yes",
        companionsConfirmed: 1,
        message: "  Confirmado  ",
      })
    ).outcome,
    "created",
  );
  assert.deepEqual(auditWrites[0], {
    entityType: "rsvp_response",
    entityId: "rsvp-created",
    actionType: "RSVP_SUBMITTED",
    actorType: "guest",
    actorGuestId: "guest-1",
    requestId: undefined,
    metadata: {
      eventId: "event-1",
      responseStatus: "yes",
      companionsConfirmed: 1,
      outcome: "created",
    },
  });

  currentResponse = existingResponse;
  assert.equal(
    (
      await confirmUseCase.execute({
        eventId: "event-1",
        guestId: "guest-1",
        responseStatus: "yes",
        companionsConfirmed: 1,
        message: " Confirmado ",
      })
    ).outcome,
    "replayed",
  );
  assert.equal(auditWrites[1]?.entityId, "rsvp-1");

  await assert.rejects(
    () =>
      confirmUseCase.execute({
        eventId: "event-1",
        guestId: "guest-1",
        responseStatus: "yes",
        companionsConfirmed: 2,
      }),
    (error: unknown) =>
      error instanceof GuestsRsvpApplicationError && error.reason === "companions_limit_exceeded",
  );
  assert.equal(auditWrites.length, 2);

  const declineUseCase = createDeclineAttendanceUseCase(sharedDependencies);
  currentResponse = null;
  const declined = await declineUseCase.execute({
    eventId: "event-1",
    guestId: "guest-1",
    message: "Nao vou conseguir",
    requestId: "req-rsvp-1",
  });
  assert.equal(declined.persistedResponse.responseStatus, "no");
  assert.equal(declined.persistedResponse.companionsConfirmed, 0);
  assert.deepEqual(auditWrites[2], {
    entityType: "rsvp_response",
    entityId: "rsvp-created",
    actionType: "RSVP_SUBMITTED",
    actorType: "guest",
    actorGuestId: "guest-1",
    requestId: "req-rsvp-1",
    metadata: {
      eventId: "event-1",
      responseStatus: "no",
      companionsConfirmed: 0,
      outcome: "created",
    },
  });
}

export async function runGuestsRsvpApplicationTests(): Promise<void> {
  await runNamedTests("guests-rsvp/application", [
    { name: "builds RSVP idempotency key", run: testRsvpIdempotencyKeyBuilder },
    { name: "gets invitation overview", run: testGetGuestInvitationOverviewUseCase },
    { name: "confirms and declines attendance", run: testConfirmAndDeclineAttendanceUseCases },
  ]);
}
