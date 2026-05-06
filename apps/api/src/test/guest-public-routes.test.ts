import assert from "node:assert/strict";
import { buildApp } from "../main.js";
import { SignedAdminSessionService, SignedGuestSessionService } from "../modules/identity-access/index.js";
import { REQUEST_ID_HEADER } from "../modules/shared/platform/logging/create-api-logger.js";
import { createTestEnv, runNamedTests } from "./test-helpers.js";

const GROUP_ID = "550e8400-e29b-41d4-a716-446655440100";
const GUEST_ID = "550e8400-e29b-41d4-a716-446655440101";
const INVITE_ID = "550e8400-e29b-41d4-a716-446655440102";
const EVENT_ONE_ID = "550e8400-e29b-41d4-a716-446655440103";
const EVENT_TWO_ID = "550e8400-e29b-41d4-a716-446655440104";
const EVENT_THREE_ID = "550e8400-e29b-41d4-a716-446655440105";

function createPrismaStub() {
  const inviteTokens = new Map<string, any>([
    [
      "valid-token",
      {
        id: INVITE_ID,
        guestGroupId: GROUP_ID,
        guestId: GUEST_ID,
        tokenHash: "valid-token",
        shortCode: "TOK123",
        channel: "MANUAL",
        status: "ISSUED",
        issuedAt: new Date("2026-05-01T10:00:00.000Z"),
        expiresAt: new Date("2026-06-01T10:00:00.000Z"),
        usedAt: null,
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ],
    [
      "code-token",
      {
        id: "550e8400-e29b-41d4-a716-446655440114",
        guestGroupId: GROUP_ID,
        guestId: GUEST_ID,
        tokenHash: "code-token",
        shortCode: "CODE123",
        channel: "MANUAL",
        status: "ISSUED",
        issuedAt: new Date("2026-05-01T10:00:00.000Z"),
        expiresAt: new Date("2026-06-01T10:00:00.000Z"),
        usedAt: null,
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ],
    [
      "expired-token",
      {
        id: "550e8400-e29b-41d4-a716-446655440106",
        guestGroupId: GROUP_ID,
        guestId: GUEST_ID,
        tokenHash: "expired-token",
        shortCode: "EXP123",
        channel: "MANUAL",
        status: "ISSUED",
        issuedAt: new Date("2026-04-01T10:00:00.000Z"),
        expiresAt: new Date("2026-04-10T10:00:00.000Z"),
        usedAt: null,
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
        updatedAt: new Date("2026-04-01T10:00:00.000Z"),
      },
    ],
    [
      "revoked-token",
      {
        id: "550e8400-e29b-41d4-a716-446655440107",
        guestGroupId: GROUP_ID,
        guestId: GUEST_ID,
        tokenHash: "revoked-token",
        shortCode: "REV123",
        channel: "MANUAL",
        status: "REVOKED",
        issuedAt: new Date("2026-05-01T10:00:00.000Z"),
        expiresAt: new Date("2026-06-01T10:00:00.000Z"),
        usedAt: null,
        revokedAt: new Date("2026-05-02T10:00:00.000Z"),
        revokedReason: "manual",
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-02T10:00:00.000Z"),
      },
    ],
    [
      "used-token",
      {
        id: "550e8400-e29b-41d4-a716-446655440108",
        guestGroupId: GROUP_ID,
        guestId: GUEST_ID,
        tokenHash: "used-token",
        shortCode: "USED123",
        channel: "MANUAL",
        status: "USED",
        issuedAt: new Date("2026-05-01T10:00:00.000Z"),
        expiresAt: new Date("2026-06-01T10:00:00.000Z"),
        usedAt: new Date("2026-05-03T10:00:00.000Z"),
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-03T10:00:00.000Z"),
      },
    ],
  ]);
  const guest = {
    id: GUEST_ID,
    guestGroupId: GROUP_ID,
    fullName: "Ana Souza",
    phone: null,
    email: "ana@example.com",
    isPrimary: true,
    status: "ACTIVE",
    lastAccessAt: null,
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  };
  const guestGroup = {
    id: GROUP_ID,
    displayName: "Familia Souza",
    groupCode: "SOUZA",
    allowedCompanions: 2,
    primaryContactName: "Ana Souza",
    primaryContactPhone: null,
    primaryContactEmail: "ana@example.com",
    notes: null,
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
  };
  const events = new Map<string, any>([
    [
      EVENT_ONE_ID,
      {
        id: EVENT_ONE_ID,
        slug: "cha-de-panela",
        name: "Cha de Panela",
        eventType: "BRIDAL_SHOWER",
        startsAt: new Date("2026-06-01T14:00:00.000Z"),
        venueName: "Salao Azul",
        addressLine: "Rua A",
        addressNumber: "10",
        neighborhood: null,
        city: "Sao Paulo",
        state: "SP",
        postalCode: null,
        latitude: null,
        longitude: null,
        mapUrl: "https://maps.example.com/a",
        notes: null,
        isActive: true,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ],
    [
      EVENT_TWO_ID,
      {
        id: EVENT_TWO_ID,
        slug: "casamento",
        name: "Casamento",
        eventType: "WEDDING",
        startsAt: new Date("2026-07-01T16:00:00.000Z"),
        venueName: "Espaco Jardim",
        addressLine: "Rua B",
        addressNumber: "20",
        neighborhood: null,
        city: "Sao Paulo",
        state: "SP",
        postalCode: null,
        latitude: null,
        longitude: null,
        mapUrl: "https://maps.example.com/b",
        notes: null,
        isActive: true,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ],
    [
      EVENT_THREE_ID,
      {
        id: EVENT_THREE_ID,
        slug: "inativo",
        name: "Evento Inativo",
        eventType: "WEDDING",
        startsAt: new Date("2026-08-01T16:00:00.000Z"),
        venueName: "Espaco C",
        addressLine: "Rua C",
        addressNumber: "30",
        neighborhood: null,
        city: "Sao Paulo",
        state: "SP",
        postalCode: null,
        latitude: null,
        longitude: null,
        mapUrl: null,
        notes: null,
        isActive: false,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ],
  ]);
  const eligibility = [
    { id: "550e8400-e29b-41d4-a716-446655440109", eventId: EVENT_ONE_ID, guestId: GUEST_ID, canRsvp: true, createdAt: new Date("2026-05-01T10:00:00.000Z") },
    { id: "550e8400-e29b-41d4-a716-446655440110", eventId: EVENT_TWO_ID, guestId: GUEST_ID, canRsvp: true, createdAt: new Date("2026-05-01T10:00:00.000Z") },
    { id: "550e8400-e29b-41d4-a716-446655440111", eventId: EVENT_THREE_ID, guestId: GUEST_ID, canRsvp: true, createdAt: new Date("2026-05-01T10:00:00.000Z") },
  ];
  const responses = [
    {
      id: "550e8400-e29b-41d4-a716-446655440112",
      eventId: EVENT_TWO_ID,
      guestId: GUEST_ID,
      responseStatus: "YES",
      companionsConfirmed: 1,
      message: "Confirmado",
      respondedAt: new Date("2026-05-10T12:00:00.000Z"),
      createdAt: new Date("2026-05-10T12:00:00.000Z"),
      updatedAt: new Date("2026-05-10T12:00:00.000Z"),
    },
  ];

  return {
    inviteToken: {
      async findUnique(args: { where: { id?: string; tokenHash?: string } }) {
        if (args.where.id) {
          return [...inviteTokens.values()].find((token) => token.id === args.where.id) ?? null;
        }

        return inviteTokens.get(args.where.tokenHash ?? "") ?? null;
      },
      async findFirst(args: { where: { shortCode: string } }) {
        return [...inviteTokens.values()].find((token) => token.shortCode === args.where.shortCode) ?? null;
      },
      async findMany() {
        return [];
      },
      async upsert(args: { create: any }) {
        return args.create;
      },
      async update(args: { where: { id: string }; data: any }) {
        const token = [...inviteTokens.values()].find((entry) => entry.id === args.where.id);
        if (!token) {
          throw new Error("Invite token not found");
        }
        Object.assign(token, args.data);
        return token;
      },
    },
    guest: {
      async findUnique(args: { where: { id: string } }) {
        return args.where.id === GUEST_ID ? guest : null;
      },
      async findFirst(args: { where: { guestGroupId: string; isPrimary?: boolean } }) {
        return args.where.guestGroupId === GROUP_ID ? guest : null;
      },
      async findMany(args: { where: { guestGroupId?: string } }) {
        return args.where.guestGroupId === GROUP_ID ? [guest] : [];
      },
      async upsert(args: { create: any }) {
        return args.create;
      },
    },
    guestGroup: {
      async findUnique(args: { where: { id: string } }) {
        return args.where.id === GROUP_ID ? guestGroup : null;
      },
      async findMany() {
        return [guestGroup];
      },
      async upsert(args: { create: any }) {
        return args.create;
      },
    },
    event: {
      async findUnique(args: { where: { id?: string; slug?: string } }) {
        if (args.where.id) {
          return events.get(args.where.id) ?? null;
        }
        return [...events.values()].find((event) => event.slug === args.where.slug) ?? null;
      },
      async findMany() {
        return [...events.values()];
      },
      async upsert(args: { create: any }) {
        return args.create;
      },
    },
    eventGuestEligibility: {
      async findUnique() {
        return null;
      },
      async findFirst(args: { where: { eventId: string; guestId: string } }) {
        return (
          eligibility.find(
            (entry) => entry.eventId === args.where.eventId && entry.guestId === args.where.guestId,
          ) ?? null
        );
      },
      async findMany(args: { where: { eventId?: string; guestId?: string; guestIdIn?: string[]; canRsvp?: boolean } | any }) {
        return eligibility.filter((entry) => {
          if (args.where.eventId && entry.eventId !== args.where.eventId) return false;
          if (args.where.guestId && entry.guestId !== args.where.guestId) return false;
          if (args.where.canRsvp !== undefined && entry.canRsvp !== args.where.canRsvp) return false;
          return true;
        });
      },
      async upsert(args: { create: any }) {
        return args.create;
      },
    },
    rsvpResponse: {
      async findUnique() {
        return null;
      },
      async findFirst(args: { where: { eventId?: string; guestId?: string } }) {
        return (
          responses.find(
            (entry) =>
              (!args.where.eventId || entry.eventId === args.where.eventId) &&
              (!args.where.guestId || entry.guestId === args.where.guestId),
          ) ?? null
        );
      },
      async findMany(args: { where: { guestId?: string } }) {
        return responses.filter((entry) => !args.where.guestId || entry.guestId === args.where.guestId);
      },
      async upsert(args: { create: any }) {
        return args.create;
      },
      async update(args: { data: any }) {
        return args.data;
      },
    },
    auditLog: {
      async findUnique() {
        return null;
      },
      async findMany() {
        return [];
      },
      async upsert(args: { create: any }) {
        return {
          ...args.create,
          metadata: args.create.metadata ?? null,
        };
      },
    },
    async $transaction<T>(operation: (tx: any) => Promise<T>) {
      return operation({
        inviteToken: this.inviteToken,
      });
    },
    async $disconnect() {},
  };
}

async function testGuestLoginRoutesAndProtectedGuestPages(): Promise<void> {
  const env = createTestEnv();
  const prisma = createPrismaStub();
  const guestSessionService = new SignedGuestSessionService(env.JWT_SECRET, 300, () => new Date("2026-05-15T10:00:00.000Z"));
  const adminSessionService = new SignedAdminSessionService(env.JWT_SECRET, 300, () => new Date("2026-05-15T10:00:00.000Z"));
  const app = await buildApp(env, {
    prisma: prisma as never,
    guestSessionService,
    adminSessionVerifier: adminSessionService,
  });

  try {
    const tokenLogin = await app.inject({
      method: "POST",
      url: "/auth/guest/login/token",
      headers: {
        [REQUEST_ID_HEADER]: "req-login-token-1",
      },
      payload: {
        token: "valid-token",
      },
    });
    assert.equal(tokenLogin.statusCode, 200);
    assert.equal(tokenLogin.json().actorType, "guest");
    assert.match(String(tokenLogin.headers["set-cookie"]), /weddingos_guest_session=/);

    for (const token of ["missing-token", "expired-token", "revoked-token", "used-token"]) {
      const invalidResponse = await app.inject({
        method: "POST",
        url: "/auth/guest/login/token",
        payload: { token },
      });
      assert.equal(invalidResponse.statusCode, 401);
      assert.deepEqual(invalidResponse.json(), {
        code: "GUEST_AUTHENTICATION_FAILED",
        message: "Invalid guest credentials",
      });
    }

    const codeLogin = await app.inject({
      method: "POST",
      url: "/auth/guest/login/code",
      payload: {
        code: "CODE123",
      },
    });
    assert.equal(codeLogin.statusCode, 200);
    assert.equal(codeLogin.json().actorId, GUEST_ID);
    assert.match(String(codeLogin.headers["set-cookie"]), /HttpOnly/);

    const guestSession = await guestSessionService.issueSession({
      guestId: GUEST_ID,
      guestGroupId: GROUP_ID,
      issuedAt: new Date("2026-05-15T10:00:00.000Z"),
    });
    const guestHomeMissingAuth = await app.inject({
      method: "GET",
      url: "/guest/home",
    });
    assert.equal(guestHomeMissingAuth.statusCode, 401);
    assert.deepEqual(guestHomeMissingAuth.json(), {
      code: "GUEST_AUTH_REQUIRED",
      message: "Authentication required",
    });

    const guestHome = await app.inject({
      method: "GET",
      url: "/guest/home",
      headers: {
        authorization: `Bearer ${guestSession.accessToken}`,
      },
    });
    assert.equal(guestHome.statusCode, 200);
    assert.equal(guestHome.json().guestGroup.id, GROUP_ID);
    assert.equal(guestHome.json().events.length, 3);

    const eventsResponse = await app.inject({
      method: "GET",
      url: "/events?eventType=wedding&page=1&pageSize=10",
      headers: {
        cookie: `weddingos_guest_session=${encodeURIComponent(guestSession.accessToken)}`,
      },
    });
    assert.equal(eventsResponse.statusCode, 200);
    assert.deepEqual(eventsResponse.json().items.map((item: { id: string }) => item.id), [EVENT_TWO_ID]);

    const adminSession = await adminSessionService.issueSession({
      adminUserId: "550e8400-e29b-41d4-a716-446655440113",
      role: "super_admin",
      issuedAt: new Date("2026-05-15T10:00:00.000Z"),
    });
    const forbidden = await app.inject({
      method: "GET",
      url: "/events",
      headers: {
        authorization: `Bearer ${adminSession.accessToken}`,
      },
    });
    assert.equal(forbidden.statusCode, 403);
    assert.deepEqual(forbidden.json(), {
      code: "GUEST_ACCESS_FORBIDDEN",
      message: "Access forbidden",
    });
  } finally {
    await app.close();
  }
}

export async function runGuestPublicRouteTests(): Promise<void> {
  await runNamedTests("guest-public-routes", [
    { name: "handles guest login and guest routes", run: testGuestLoginRoutesAndProtectedGuestPages },
  ]);
}
