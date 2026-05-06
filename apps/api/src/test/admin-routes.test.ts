import assert from "node:assert/strict";
import { buildApp } from "../main.js";
import { SignedAdminMagicLinkService, SignedAdminSessionService, SignedGuestSessionService } from "../modules/identity-access/index.js";
import { createTestEnv, runNamedTests } from "./test-helpers.js";

const GROUP_ONE_ID = "550e8400-e29b-41d4-a716-446655440201";
const GROUP_TWO_ID = "550e8400-e29b-41d4-a716-446655440202";
const GUEST_ONE_ID = "550e8400-e29b-41d4-a716-446655440203";
const GUEST_TWO_ID = "550e8400-e29b-41d4-a716-446655440204";
const EVENT_ID = "550e8400-e29b-41d4-a716-446655440205";

function createPrismaStub() {
  const adminUsers = new Map<string, any>([
    [
      "admin@example.com",
      {
        id: "550e8400-e29b-41d4-a716-446655440206",
        name: "Admin Ativo",
        email: "admin@example.com",
        authProvider: "email_magic_link",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        lastLoginAt: null,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ],
    [
      "disabled@example.com",
      {
        id: "550e8400-e29b-41d4-a716-446655440207",
        name: "Admin Inativo",
        email: "disabled@example.com",
        authProvider: "email_magic_link",
        role: "SUPER_ADMIN",
        status: "DISABLED",
        lastLoginAt: null,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ],
  ]);

  const guestGroups = new Map<string, any>([
    [
      GROUP_ONE_ID,
      {
        id: GROUP_ONE_ID,
        displayName: "Familia Souza",
        groupCode: "SOUZA",
        allowedCompanions: 2,
        primaryContactName: "Ana Souza",
        primaryContactPhone: null,
        primaryContactEmail: "ana@example.com",
        notes: null,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ],
    [
      GROUP_TWO_ID,
      {
        id: GROUP_TWO_ID,
        displayName: "Familia Lima",
        groupCode: "LIMA",
        allowedCompanions: 0,
        primaryContactName: "Carlos Lima",
        primaryContactPhone: null,
        primaryContactEmail: "carlos@example.com",
        notes: null,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      },
    ],
  ]);

  const guests = [
    {
      id: GUEST_ONE_ID,
      guestGroupId: GROUP_ONE_ID,
      fullName: "Ana Souza",
      phone: null,
      email: "ana@example.com",
      isPrimary: true,
      status: "ACTIVE",
      lastAccessAt: null,
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    },
    {
      id: GUEST_TWO_ID,
      guestGroupId: GROUP_TWO_ID,
      fullName: "Carlos Lima",
      phone: null,
      email: "carlos@example.com",
      isPrimary: true,
      status: "INACTIVE",
      lastAccessAt: null,
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
      updatedAt: new Date("2026-05-01T11:00:00.000Z"),
    },
  ];

  const eligibilities = [
    {
      id: "550e8400-e29b-41d4-a716-446655440208",
      eventId: EVENT_ID,
      guestId: GUEST_ONE_ID,
      canRsvp: true,
      createdAt: new Date("2026-05-01T12:00:00.000Z"),
    },
  ];

  const responses = [
    {
      id: "550e8400-e29b-41d4-a716-446655440209",
      eventId: EVENT_ID,
      guestId: GUEST_ONE_ID,
      responseStatus: "YES",
      companionsConfirmed: 1,
      message: "Confirmado",
      respondedAt: new Date("2026-05-04T12:00:00.000Z"),
      createdAt: new Date("2026-05-04T12:00:00.000Z"),
      updatedAt: new Date("2026-05-04T12:00:00.000Z"),
    },
  ];

  const noopDelegate = {
    async findUnique() {
      return null;
    },
    async findFirst() {
      return null;
    },
    async findMany() {
      return [];
    },
    async upsert(args: { create: unknown }) {
      return args.create;
    },
    async create(args: { data: unknown }) {
      return args.data;
    },
    async update(args: { data: unknown }) {
      return args.data;
    },
  };

  return {
    adminUser: {
      async findUnique(args: { where: { id?: string; email?: string } }) {
        if (args.where.email) {
          return adminUsers.get(args.where.email) ?? null;
        }

        return (
          [...adminUsers.values()].find((adminUser) => adminUser.id === args.where.id) ?? null
        );
      },
      findMany: noopDelegate.findMany,
      upsert: noopDelegate.upsert,
    },
    guest: {
      async findUnique(args: { where: { id: string } }) {
        return guests.find((guest) => guest.id === args.where.id) ?? null;
      },
      async findFirst(args: { where: { guestGroupId: string; isPrimary?: boolean } }) {
        return (
          guests.find(
            (guest) =>
              guest.guestGroupId === args.where.guestGroupId &&
              (args.where.isPrimary === undefined || guest.isPrimary === args.where.isPrimary),
          ) ?? null
        );
      },
      async findMany(args: {
        where: {
          guestGroupId?: string;
          status?: string;
          eventEligibilities?: { some: { eventId: string } };
          OR?: Array<{
            fullName?: { contains: string; mode: "insensitive" };
            email?: { contains: string; mode: "insensitive" };
            phone?: { contains: string; mode: "insensitive" };
          }>;
        };
        skip: number;
        take: number;
      }) {
        const filtered = guests.filter((guest) => {
          if (args.where.guestGroupId && guest.guestGroupId !== args.where.guestGroupId) {
            return false;
          }
          if (args.where.status && guest.status !== args.where.status) {
            return false;
          }
          if (
            args.where.eventEligibilities?.some.eventId &&
            !eligibilities.some(
              (entry) =>
                entry.guestId === guest.id &&
                entry.eventId === args.where.eventEligibilities?.some.eventId,
            )
          ) {
            return false;
          }
          if (args.where.OR && args.where.OR.length > 0) {
            const search = args.where.OR[0]?.fullName?.contains?.toLowerCase() ?? "";
            const haystacks = [guest.fullName, guest.email ?? "", guest.phone ?? ""].map((value) =>
              value.toLowerCase(),
            );
            if (!haystacks.some((value) => value.includes(search))) {
              return false;
            }
          }
          return true;
        });

        return filtered.slice(args.skip, args.skip + args.take);
      },
      upsert: noopDelegate.upsert,
    },
    guestGroup: {
      async findUnique(args: { where: { id: string } }) {
        return guestGroups.get(args.where.id) ?? null;
      },
      findMany: noopDelegate.findMany,
      upsert: noopDelegate.upsert,
    },
    eventGuestEligibility: {
      findUnique: noopDelegate.findUnique,
      async findMany(args: {
        where: { eventId?: string; guestId?: string | { in: string[] } };
        skip?: number;
        take?: number;
      }) {
        const guestIdFilter = args.where.guestId;
        const scoped = eligibilities.filter((entry) => {
          if (args.where.eventId && entry.eventId !== args.where.eventId) {
            return false;
          }
          if (typeof guestIdFilter === "string") {
            return entry.guestId === guestIdFilter;
          }
          if (guestIdFilter?.in) {
            return guestIdFilter.in.includes(entry.guestId);
          }
          return true;
        });

        const skip = args.skip ?? 0;
        const take = args.take ?? scoped.length;
        return scoped.slice(skip, skip + take);
      },
      upsert: noopDelegate.upsert,
    },
    rsvpResponse: {
      async findUnique(args: { where: { id?: string; eventId_guestId?: { eventId: string; guestId: string } } }) {
        if (args.where.id) {
          return responses.find((response) => response.id === args.where.id) ?? null;
        }
        const composite = args.where.eventId_guestId;
        return (
          responses.find(
            (response) =>
              response.eventId === composite?.eventId && response.guestId === composite.guestId,
          ) ?? null
        );
      },
      async findMany(args: {
        where: {
          eventId?: string;
          guestId?: string | { in: string[] };
          responseStatus?: string;
          guest?: {
            guestGroupId?: string;
            OR?: Array<{
              fullName?: { contains: string; mode: "insensitive" };
              email?: { contains: string; mode: "insensitive" };
              phone?: { contains: string; mode: "insensitive" };
            }>;
          };
        };
        skip?: number;
        take?: number;
      }) {
        const guestIdFilter = args.where.guestId;
        const filtered = responses.filter((response) => {
          if (args.where.eventId && response.eventId !== args.where.eventId) {
            return false;
          }
          if (typeof guestIdFilter === "string" && response.guestId !== guestIdFilter) {
            return false;
          }
          if (guestIdFilter && typeof guestIdFilter === "object" && !guestIdFilter.in.includes(response.guestId)) {
            return false;
          }
          if (args.where.responseStatus && response.responseStatus !== args.where.responseStatus) {
            return false;
          }
          const guest = guests.find((entry) => entry.id === response.guestId);
          if (!guest) {
            return false;
          }
          if (args.where.guest?.guestGroupId && guest.guestGroupId !== args.where.guest.guestGroupId) {
            return false;
          }
          if (args.where.guest?.OR && args.where.guest.OR.length > 0) {
            const search = args.where.guest.OR[0]?.fullName?.contains?.toLowerCase() ?? "";
            const haystacks = [guest.fullName, guest.email ?? "", guest.phone ?? ""].map((value) =>
              value.toLowerCase(),
            );
            if (!haystacks.some((value) => value.includes(search))) {
              return false;
            }
          }
          return true;
        });

        const skip = args.skip ?? 0;
        const take = args.take ?? filtered.length;
        return filtered.slice(skip, skip + take);
      },
      upsert: noopDelegate.upsert,
      create: noopDelegate.create,
      update: noopDelegate.update,
    },
    inviteToken: noopDelegate,
    gift: noopDelegate,
    giftReservation: noopDelegate,
    photoPost: noopDelegate,
    auditLog: {
      findUnique: noopDelegate.findUnique,
      findMany: noopDelegate.findMany,
      upsert: noopDelegate.upsert,
    },
    async $transaction<T>(operation: (tx: any) => Promise<T>) {
      return operation({
        inviteToken: this.inviteToken,
      });
    },
    async $disconnect() {},
  };
}

async function testAdminLoginReturnsAcceptedForKnownAndUnknownEmails(): Promise<void> {
  const env = createTestEnv();
  const app = await buildApp(env, {
    prisma: createPrismaStub() as never,
    adminMagicLinkService: new SignedAdminMagicLinkService(env.JWT_SECRET, 900, () => new Date("2026-05-15T10:00:00.000Z")),
  });

  try {
    const activeResponse = await app.inject({
      method: "POST",
      url: "/auth/admin/login",
      payload: { email: " admin@example.com " },
    });
    assert.equal(activeResponse.statusCode, 200);
    assert.deepEqual(activeResponse.json(), { accepted: true });

    const missingResponse = await app.inject({
      method: "POST",
      url: "/auth/admin/login",
      payload: { email: "missing@example.com" },
    });
    assert.equal(missingResponse.statusCode, 200);
    assert.deepEqual(missingResponse.json(), { accepted: true });

    const disabledResponse = await app.inject({
      method: "POST",
      url: "/auth/admin/login",
      payload: { email: "disabled@example.com" },
    });
    assert.equal(disabledResponse.statusCode, 200);
    assert.deepEqual(disabledResponse.json(), { accepted: true });
  } finally {
    await app.close();
  }
}

async function testAdminRoutesRequireAdminAuth(): Promise<void> {
  const env = createTestEnv();
  const guestSessionService = new SignedGuestSessionService(env.JWT_SECRET, 300, () => new Date());
  const adminSessionService = new SignedAdminSessionService(env.JWT_SECRET, 300, () => new Date());
  const app = await buildApp(env, {
    prisma: createPrismaStub() as never,
    adminSessionVerifier: adminSessionService,
  });

  try {
    const missingCredentials = await app.inject({
      method: "GET",
      url: "/admin/guests",
    });
    assert.equal(missingCredentials.statusCode, 401);
    assert.deepEqual(missingCredentials.json(), {
      code: "ADMIN_AUTH_REQUIRED",
      message: "Authentication required",
    });

    const guestSession = await guestSessionService.issueSession({
      guestId: GUEST_ONE_ID,
      guestGroupId: GROUP_ONE_ID,
    });
    const guestResponse = await app.inject({
      method: "GET",
      url: "/admin/guests",
      headers: {
        authorization: `Bearer ${guestSession.accessToken}`,
      },
    });
    assert.equal(guestResponse.statusCode, 403);
    assert.deepEqual(guestResponse.json(), {
      code: "ADMIN_ACCESS_FORBIDDEN",
      message: "Access forbidden",
    });

    const adminSession = await adminSessionService.issueSession({
      adminUserId: "550e8400-e29b-41d4-a716-446655440206",
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

async function testAdminGuestsRouteListsFilteredRows(): Promise<void> {
  const env = createTestEnv();
  const adminSessionService = new SignedAdminSessionService(env.JWT_SECRET, 300, () => new Date());
  const adminSession = await adminSessionService.issueSession({
    adminUserId: "550e8400-e29b-41d4-a716-446655440206",
    role: "super_admin",
  });
  const app = await buildApp(env, {
    prisma: createPrismaStub() as never,
    adminSessionVerifier: adminSessionService,
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: `/admin/guests?eventId=${EVENT_ID}&guestGroupId=${GROUP_ONE_ID}&status=active&search=Ana&page=1&pageSize=10`,
      headers: {
        authorization: `Bearer ${adminSession.accessToken}`,
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.page, 1);
    assert.equal(body.pageSize, 10);
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].guest.id, GUEST_ONE_ID);
    assert.equal(body.items[0].guest.fullName, "Ana Souza");
    assert.equal(body.items[0].guest.status, "active");
    assert.equal(body.items[0].guestGroup.id, GROUP_ONE_ID);
    assert.equal(body.items[0].eligibility.length, 1);
    assert.equal(body.items[0].responses.length, 1);
    assert.equal(
      body.items[0].responses[0].respondedAt,
      "2026-05-04T12:00:00.000Z",
    );
  } finally {
    await app.close();
  }
}

export async function runAdminRouteTests(): Promise<void> {
  await runNamedTests("admin-routes", [
    { name: "admin login returns accepted without leaking account state", run: testAdminLoginReturnsAcceptedForKnownAndUnknownEmails },
    { name: "requires admin auth on admin routes", run: testAdminRoutesRequireAdminAuth },
    { name: "lists filtered admin guest rows", run: testAdminGuestsRouteListsFilteredRows },
  ]);
}
