import assert from "node:assert/strict";
import type {
  AdminUser as PrismaAdminUserRecord,
  Guest as PrismaGuestRecord,
  InviteToken as PrismaInviteTokenRecord,
} from "../../generated/prisma/client.js";
import type { AdminUser } from "../../modules/identity-access/index.js";
import {
  PrismaAdminUserRepository,
  PrismaGuestRepository,
  PrismaInviteTokenConsumptionTransactionRunner,
  PrismaInviteTokenRepository,
  SignedAdminMagicLinkService,
  SignedAdminSessionService,
  SignedGuestSessionService,
} from "../../modules/identity-access/index.js";
import { runNamedTests } from "../test-helpers.js";

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
    async findFirst(args: { where: { shortCode: string }; orderBy: { createdAt: "asc" | "desc" } }) {
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
      return { ...persistenceRecord, ...args.update };
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      calls.push({ method: "update", args });
      return { ...persistenceRecord, ...args.data };
    },
  };

  const repository = new PrismaInviteTokenRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaInviteTokenRepository>[0],
  );

  assert.equal((await repository.findById("invite-1"))?.status, "issued");
  assert.equal((await repository.findByTokenHash("hash-1"))?.tokenHash, "hash-1");
  assert.equal((await repository.findByShortCode("ABC123"))?.shortCode, "ABC123");
  assert.equal(
    (await repository.findMany({ page: 2, pageSize: 10, guestGroupId: "group-1", status: "issued" }))
      .length,
    1,
  );
  assert.equal(
    (
      await repository.save({
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
      })
    ).channel,
    "email",
  );
  assert.equal(
    (
      await repository.markAsUsed({
        inviteTokenId: "invite-1",
        usedAt: new Date("2026-05-01T12:00:00.000Z"),
      })
    ).status,
    "used",
  );
  assert.equal(
    (
      await repository.revoke({
        inviteTokenId: "invite-1",
        reason: "security reset",
        revokedAt: new Date("2026-05-01T13:00:00.000Z"),
      })
    ).status,
    "revoked",
  );

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
      return args.where.id === "invite-1" ? transactionRecord : null;
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
  const prisma = {
    inviteToken: { ...inviteTokenDelegate },
    async $transaction<T>(
      operation: (transactionClient: { inviteToken: typeof inviteTokenDelegate }) => Promise<T>,
    ) {
      return operation({ inviteToken: this.inviteToken });
    },
  };

  const runner = new PrismaInviteTokenConsumptionTransactionRunner(prisma);
  const result = await runner.run(async (context) => {
    assert.equal((await context.findInviteTokenById("invite-1"))?.status, "issued");
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
    async upsert(args: { update: Record<string, unknown> }) {
      return { ...persistenceRecord, ...args.update };
    },
  };
  const repository = new PrismaGuestRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaGuestRepository>[0],
  );

  assert.equal((await repository.findById("guest-1"))?.status, "active");
  assert.equal((await repository.findPrimaryByGroupId("group-1"))?.isPrimary, true);
  assert.equal((await repository.findMany({ page: 1, pageSize: 20, guestGroupId: "group-1", status: "active" })).length, 1);
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
    async findMany() {
      return [persistenceRecord];
    },
    async upsert(args: { update: Record<string, unknown> }) {
      return { ...persistenceRecord, ...args.update };
    },
  };
  const repository = new PrismaAdminUserRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaAdminUserRepository>[0],
  );

  assert.equal((await repository.findById("admin-1"))?.role, "super_admin");
  assert.equal((await repository.findByEmail("admin@example.com"))?.email, "admin@example.com");
  assert.equal(
    (await repository.findMany({ page: 1, pageSize: 20, role: "super_admin", status: "active", search: "admin" })).length,
    1,
  );
  assert.equal(
    (
      await repository.save({
        id: "admin-2",
        name: "Editor User",
        email: "editor@example.com",
        authProvider: "email_magic_link",
        role: "editor",
        status: "disabled",
        lastLoginAt: null,
        createdAt: new Date("2026-05-01T10:00:00.000Z"),
        updatedAt: new Date("2026-05-01T10:00:00.000Z"),
      } satisfies AdminUser)
    ).role,
    "editor",
  );
  assert.deepEqual(calls[1], {
    method: "findUnique",
    args: { where: { email: "admin@example.com" } },
  });
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

  assert.equal((await service.verifySession({ token: issued.accessToken, requestId: "req-admin-1" }))?.actorType, "admin");
  assert.deepEqual(await service.verifySession({
    token: (await guestService.issueSession({ guestId: "guest-1", guestGroupId: "group-1", issuedAt: now })).accessToken,
    requestId: "req-admin-2",
  }), {
    actorType: "guest",
    guestId: "guest-1",
    guestGroupId: "group-1",
  });
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

  assert.equal((await service.verifySession({ token: issued.accessToken, requestId: "req-1" }))?.actorType, "guest");
}

export async function runIdentityAccessInfrastructureTests(): Promise<void> {
  await runNamedTests("identity-access/infrastructure", [
    { name: "prisma invite token repository", run: testPrismaInviteTokenRepository },
    { name: "prisma invite token transaction runner", run: testPrismaInviteTokenTransactionRunner },
    { name: "prisma guest repository", run: testPrismaGuestRepository },
    { name: "prisma admin user repository", run: testPrismaAdminUserRepository },
    { name: "admin magic link service", run: testAdminMagicLinkService },
    { name: "admin session service", run: testAdminSessionService },
    { name: "guest session service", run: testGuestSessionService },
  ]);
}
