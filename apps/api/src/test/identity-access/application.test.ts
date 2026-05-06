import assert from "node:assert/strict";
import type { AdminUser, Guest as IdentityAccessGuest, InviteToken } from "../../modules/identity-access/index.js";
import {
  assertInviteTokenIsUsable,
  buildGuestSessionCookieAttributes,
  canConsumeInviteToken,
  consumeInviteToken,
  createIssueGuestSessionUseCase,
  createLoginGuestWithInviteTokenUseCase,
  createLoginGuestWithShortCodeUseCase,
  createRequestAdminMagicLinkUseCase,
  createRevokeInviteTokenUseCase,
  GuestInviteTokenAuthenticationError,
  type AdminMagicLinkIssueInput,
  type AdminMagicLinkIssueResult,
  InvalidInviteTokenConsumptionError,
  InviteTokenRevocationError,
  InviteTokenValidationError,
  resolveInviteTokenLifecycleStatus,
  revokeInviteToken,
  SignedGuestSessionService,
  validateInviteToken,
} from "../../modules/identity-access/index.js";
import { runNamedTests } from "../test-helpers.js";

function buildBaseInviteToken(): InviteToken {
  return {
    id: "invite-1",
    guestGroupId: "group-1",
    guestId: "guest-1",
    tokenHash: "valid-token",
    shortCode: "ABC123",
    channel: "manual",
    status: "issued",
    issuedAt: new Date("2026-04-25T12:00:00.000Z"),
    expiresAt: new Date("2026-05-10T12:00:00.000Z"),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };
}

function buildExpiredInviteToken(baseToken: InviteToken, tokenHash: string): InviteToken {
  return {
    ...baseToken,
    id: `expired-${tokenHash}`,
    tokenHash,
    status: "issued",
    expiresAt: new Date("2026-04-29T12:00:00.000Z"),
  };
}

function buildUsedInviteToken(baseToken: InviteToken, tokenHash: string): InviteToken {
  return {
    ...baseToken,
    id: `used-${tokenHash}`,
    tokenHash,
    status: "used",
    usedAt: new Date("2026-04-28T12:00:00.000Z"),
  };
}

function buildRevokedInviteToken(baseToken: InviteToken, tokenHash: string): InviteToken {
  return {
    ...baseToken,
    id: `revoked-${tokenHash}`,
    tokenHash,
    status: "revoked",
    revokedAt: new Date("2026-04-28T12:00:00.000Z"),
    revokedReason: "manual revoke",
  };
}

function testInviteTokenLifecyclePolicies(): void {
  const now = new Date("2026-04-30T12:00:00.000Z");
  const baseToken = buildBaseInviteToken();

  assert.equal(resolveInviteTokenLifecycleStatus(baseToken, now), "issued");
  assert.equal(canConsumeInviteToken(baseToken, now), true);

  const expiredToken: InviteToken = {
    ...baseToken,
    expiresAt: new Date("2026-04-29T12:00:00.000Z"),
  };
  assert.equal(resolveInviteTokenLifecycleStatus(expiredToken, now), "expired");
  assert.equal(canConsumeInviteToken(expiredToken, now), false);

  const usedToken = consumeInviteToken(baseToken, { consumedAt: now });
  assert.equal(resolveInviteTokenLifecycleStatus(usedToken, now), "used");
  assert.equal(usedToken.usedAt?.toISOString(), now.toISOString());

  const revokedToken = revokeInviteToken(baseToken, {
    reason: "guest requested reset",
    revokedAt: now,
  });
  assert.equal(resolveInviteTokenLifecycleStatus(revokedToken, now), "revoked");
  assert.equal(revokedToken.revokedReason, "guest requested reset");

  assert.throws(
    () => consumeInviteToken(expiredToken, { consumedAt: now }),
    (error: unknown) =>
      error instanceof InvalidInviteTokenConsumptionError &&
      error.lifecycleStatus === "expired" &&
      error.statusCode === 401,
  );
}

function testInviteTokenValidationService(): void {
  const now = new Date("2026-04-30T12:00:00.000Z");
  const baseToken = buildBaseInviteToken();

  assert.deepEqual(validateInviteToken(null, now), {
    ok: false,
    reason: "not_found",
    lifecycleStatus: null,
  });

  assert.deepEqual(validateInviteToken(baseToken, now), {
    ok: true,
    inviteToken: baseToken,
    lifecycleStatus: "issued",
  });

  for (const [token, reason] of [
    [{ ...baseToken, expiresAt: new Date("2026-04-29T12:00:00.000Z") }, "expired"],
    [{ ...baseToken, status: "used" as const, usedAt: new Date("2026-04-29T12:00:00.000Z") }, "used"],
    [
      {
        ...baseToken,
        status: "revoked" as const,
        revokedAt: new Date("2026-04-29T12:00:00.000Z"),
        revokedReason: "manual block",
      },
      "revoked",
    ],
  ] as const) {
    const validationResult = validateInviteToken(token, now);
    assert.equal(validationResult.ok, false);

    if (!validationResult.ok) {
      assert.equal(validationResult.reason, reason);
      assert.equal(validationResult.lifecycleStatus, reason);
    }

    assert.throws(
      () => assertInviteTokenIsUsable(token, now),
      (error: unknown) =>
        error instanceof InviteTokenValidationError &&
        error.reason === reason &&
        error.lifecycleStatus === reason &&
        error.statusCode === 401,
    );
  }
}

async function testRevokeInviteTokenUseCase(): Promise<void> {
  const baseToken: InviteToken = {
    ...buildBaseInviteToken(),
    status: "used",
    usedAt: new Date("2026-04-29T12:00:00.000Z"),
  };
  const revokeCalls: Array<{ inviteTokenId: string; reason: string; revokedAt?: Date }> = [];
  const repository = {
    async findById(id: string) {
      return id === baseToken.id ? baseToken : null;
    },
    async revoke(input: { inviteTokenId: string; reason: string; revokedAt?: Date }) {
      revokeCalls.push(input);
      return {
        ...baseToken,
        status: "revoked" as const,
        revokedAt: input.revokedAt ?? new Date("2026-04-30T12:00:00.000Z"),
        revokedReason: input.reason,
      };
    },
  };
  const useCase = createRevokeInviteTokenUseCase({
    inviteTokenRepository: repository,
  });
  const revokedAt = new Date("2026-04-30T12:00:00.000Z");

  const result = await useCase.execute({
    inviteTokenId: "invite-1",
    reason: "security reset",
    revokedAt,
  });

  assert.equal(result.status, "revoked");
  assert.equal(result.revokedReason, "security reset");
  assert.equal(result.revokedAt?.toISOString(), revokedAt.toISOString());
  assert.deepEqual(revokeCalls, [
    {
      inviteTokenId: "invite-1",
      reason: "security reset",
      revokedAt,
    },
  ]);

  await assert.rejects(
    () => useCase.execute({ inviteTokenId: "missing", reason: "security reset" }),
    (error: unknown) =>
      error instanceof InviteTokenRevocationError &&
      error.reason === "not_found" &&
      error.statusCode === 404,
  );
}

async function testLoginGuestWithInviteTokenUseCase(): Promise<void> {
  const baseGuest: IdentityAccessGuest = {
    id: "guest-1",
    guestGroupId: "group-1",
    fullName: "Joao Silva",
    phone: null,
    email: "joao@example.com",
    isPrimary: true,
    status: "active",
    lastAccessAt: null,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };
  const auditWrites: Array<Record<string, unknown>> = [];
  const auditLogWriter = {
    async write(input: {
      entityType: string;
      entityId: string;
      actionType: string;
      actorType: "admin" | "guest" | "system";
      actorAdminUserId?: string;
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
        actorAdminUserId: input.actorAdminUserId ?? null,
        actorGuestId: input.actorGuestId ?? null,
        actorType: input.actorType,
        requestId: input.requestId ?? null,
        metadata: input.metadata ?? null,
        createdAt: new Date("2026-04-30T12:00:06.000Z"),
      };
    },
  };
  const baseInviteToken = buildBaseInviteToken();
  let markCalls = 0;

  const inviteTokenRepository = {
    async findById() {
      return null;
    },
    async save(entity: InviteToken) {
      return entity;
    },
    async findMany() {
      return [] as const;
    },
    async findByTokenHash(tokenHash: string) {
      if (tokenHash === "valid-token") {
        return baseInviteToken;
      }
      if (tokenHash === "group-token") {
        return { ...baseInviteToken, id: "invite-group", guestId: null, tokenHash };
      }
      if (tokenHash === "expired-token") {
        return buildExpiredInviteToken(baseInviteToken, tokenHash);
      }
      if (tokenHash === "used-token") {
        return buildUsedInviteToken(baseInviteToken, tokenHash);
      }
      if (tokenHash === "revoked-token") {
        return buildRevokedInviteToken(baseInviteToken, tokenHash);
      }
      if (tokenHash === "missing-guest-token") {
        return { ...baseInviteToken, id: "invite-missing-guest", guestId: "guest-missing", tokenHash };
      }
      if (tokenHash === "inactive-guest-token") {
        return { ...baseInviteToken, id: "invite-inactive-guest", guestId: "guest-inactive", tokenHash };
      }
      return null;
    },
    async findByShortCode(shortCode: string) {
      const map: Record<string, string> = {
        ABC123: "valid-token",
        GROUP01: "group-token",
        EXPR01: "expired-token",
        USED01: "used-token",
        REVOK1: "revoked-token",
        MISS01: "missing-guest-token",
        INACT1: "inactive-guest-token",
      };
      return this.findByTokenHash(map[shortCode] ?? "missing");
    },
    async markAsUsed(input: { inviteTokenId: string; usedAt?: Date }) {
      markCalls += 1;
      return {
        ...baseInviteToken,
        id: input.inviteTokenId,
        status: "used" as const,
        usedAt: input.usedAt ?? new Date(),
      };
    },
    async revoke() {
      return { ...baseInviteToken, status: "revoked" as const };
    },
  };

  const guestRepository = {
    async findById(id: string) {
      if (id === "guest-1") {
        return baseGuest;
      }
      if (id === "guest-inactive") {
        return { ...baseGuest, id, status: "inactive" as const };
      }
      return null;
    },
    async save(entity: IdentityAccessGuest) {
      return entity;
    },
    async findMany() {
      return [] as const;
    },
    async findPrimaryByGroupId(guestGroupId: string) {
      return guestGroupId === "group-1" ? baseGuest : null;
    },
  };

  const transactionRunner = {
    async run<T>(operation: (context: {
      findInviteTokenById(inviteTokenId: string): Promise<InviteToken | null>;
      markInviteTokenAsUsed(input: { inviteTokenId: string; usedAt?: Date }): Promise<InviteToken>;
    }) => Promise<T>) {
      return operation({
        async findInviteTokenById(inviteTokenId: string) {
          if (inviteTokenId === "invite-group") {
            return { ...baseInviteToken, id: inviteTokenId, guestId: null };
          }
          if (inviteTokenId === "invite-1") {
            return baseInviteToken;
          }
          return null;
        },
        async markInviteTokenAsUsed(input) {
          return inviteTokenRepository.markAsUsed(input);
        },
      });
    },
  };

  const authMoments = [
    new Date("2026-04-30T12:00:00.000Z"),
    new Date("2026-04-30T12:00:05.000Z"),
  ];
  const byToken = createLoginGuestWithInviteTokenUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner: transactionRunner,
    auditLogWriter,
    now: () => authMoments.shift() ?? new Date("2026-04-30T12:00:05.000Z"),
  });

  assert.deepEqual(await byToken.execute({ token: "valid-token", requestId: "req-1" }), {
    guestId: "guest-1",
    guestGroupId: "group-1",
    inviteTokenId: "invite-1",
    authenticatedAt: new Date("2026-04-30T12:00:05.000Z"),
  });

  const byGroupToken = createLoginGuestWithInviteTokenUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner: transactionRunner,
    auditLogWriter,
    now: () => new Date("2026-04-30T13:00:00.000Z"),
  });
  assert.equal((await byGroupToken.execute({ token: "group-token" })).guestId, "guest-1");
  assert.equal(markCalls, 2);

  const failingUseCase = createLoginGuestWithInviteTokenUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner: transactionRunner,
    auditLogWriter: {
      async write() {
        throw new Error("should not audit failed login");
      },
    },
    now: () => new Date("2026-04-30T12:00:00.000Z"),
  });
  for (const token of [
    "missing-token",
    "expired-token",
    "used-token",
    "revoked-token",
    "missing-guest-token",
    "inactive-guest-token",
  ]) {
    await assert.rejects(() => failingUseCase.execute({ token }), (error: unknown) => {
      return error instanceof GuestInviteTokenAuthenticationError;
    });
  }

  markCalls = 0;
  const byShortCode = createLoginGuestWithShortCodeUseCase({
    inviteTokenRepository,
    guestRepository,
    inviteTokenConsumptionTransactionRunner: transactionRunner,
    auditLogWriter,
    now: () => new Date("2026-04-30T15:00:00.000Z"),
  });

  assert.deepEqual(await byShortCode.execute({ code: "ABC123" }), {
    guestId: "guest-1",
    guestGroupId: "group-1",
    inviteTokenId: "invite-1",
    authenticatedAt: new Date("2026-04-30T15:00:00.000Z"),
  });
  assert.equal((await byShortCode.execute({ code: "GROUP01" })).guestId, "guest-1");
  assert.equal(markCalls, 2);
  assert.equal(auditWrites.length, 4);
  assert.deepEqual(auditWrites[0], {
    entityType: "guest",
    entityId: "guest-1",
    actionType: "GUEST_LOGGED_IN",
    actorType: "guest",
    actorGuestId: "guest-1",
    requestId: "req-1",
    metadata: {
      guestGroupId: "group-1",
      inviteTokenId: "invite-1",
    },
  });
}

async function testRequestAdminMagicLinkUseCase(): Promise<void> {
  const activeAdmin: AdminUser = {
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
    authProvider: "email_magic_link",
    role: "super_admin",
    status: "active",
    lastLoginAt: null,
    createdAt: new Date("2026-04-25T12:00:00.000Z"),
    updatedAt: new Date("2026-04-25T12:00:00.000Z"),
  };
  const disabledAdmin: AdminUser = {
    ...activeAdmin,
    id: "admin-2",
    email: "disabled@example.com",
    status: "disabled",
  };
  const issuedMagicLinks: AdminMagicLinkIssueInput[] = [];
  const dispatchedMagicLinks: Array<{
    adminUserId: string;
    email: string;
    name: string;
    role: string;
    token: string;
    expiresAt: Date;
    requestId?: string;
  }> = [];
  const issuer = {
    async issueMagicLink(input: AdminMagicLinkIssueInput): Promise<AdminMagicLinkIssueResult> {
      issuedMagicLinks.push(input);
      return {
        token: "signed-admin-token",
        expiresAt: new Date("2026-05-02T12:15:00.000Z"),
        payload: {
          actorType: "admin",
          adminUserId: input.adminUserId,
          email: input.email,
          role: input.role,
          purpose: "admin_magic_link",
          iat: 1,
          exp: 2,
        },
      };
    },
  };
  const dispatcher = {
    async dispatchMagicLink(input: {
      adminUserId: string;
      email: string;
      name: string;
      role: string;
      token: string;
      expiresAt: Date;
      requestId?: string;
    }): Promise<void> {
      dispatchedMagicLinks.push(input);
    },
  };
  const useCase = createRequestAdminMagicLinkUseCase({
    adminUserRepository: {
      async findByEmail(email: string) {
        if (email === activeAdmin.email) {
          return activeAdmin;
        }
        if (email === disabledAdmin.email) {
          return disabledAdmin;
        }
        return null;
      },
    },
    adminMagicLinkIssuer: issuer,
    adminMagicLinkDispatcher: dispatcher,
  });

  assert.deepEqual(await useCase.execute({ email: activeAdmin.email, requestId: "req-1" }), {
    accepted: true,
  });
  assert.deepEqual(await useCase.execute({ email: "missing@example.com", requestId: "req-2" }), {
    accepted: true,
  });
  assert.deepEqual(await useCase.execute({ email: disabledAdmin.email, requestId: "req-3" }), {
    accepted: true,
  });
  assert.equal(issuedMagicLinks.length, 1);
  assert.equal(dispatchedMagicLinks.length, 1);
}

function testGuestSessionCookieAttributes(): void {
  const expiresAt = new Date("2026-06-01T12:00:00.000Z");
  const developmentCookie = buildGuestSessionCookieAttributes({
    nodeEnv: "development",
    expiresAt,
  });
  const productionCookie = buildGuestSessionCookieAttributes({
    nodeEnv: "production",
    expiresAt,
  });

  assert.equal(developmentCookie.name, "weddingos_guest_session");
  assert.equal(developmentCookie.httpOnly, true);
  assert.equal(developmentCookie.sameSite, "lax");
  assert.equal(developmentCookie.path, "/");
  assert.equal(developmentCookie.secure, false);
  assert.equal(productionCookie.secure, true);
  assert.equal(developmentCookie.expires, expiresAt);
}

async function testIssueGuestSessionUseCase(): Promise<void> {
  const now = new Date("2026-05-02T12:00:00.000Z");
  const service = new SignedGuestSessionService(
    "12345678901234567890123456789012",
    60,
    () => now,
  );
  const useCase = createIssueGuestSessionUseCase({
    guestSessionIssuer: service,
    env: { NODE_ENV: "test" },
  });

  const result = await useCase.execute({
    authenticationResult: {
      guestId: "guest-1",
      guestGroupId: "group-1",
      inviteTokenId: "invite-1",
      authenticatedAt: now,
    },
  });

  assert.equal(result.actorType, "guest");
  assert.equal(result.actorId, "guest-1");
  assert.equal(typeof result.accessToken, "string");
  assert.equal(result.expiresAt.toISOString(), "2026-05-02T12:01:00.000Z");
  assert.equal(result.cookie.httpOnly, true);
  assert.equal(result.cookie.secure, false);
}

export async function runIdentityAccessApplicationTests(): Promise<void> {
  await runNamedTests("identity-access/application", [
    { name: "invite token lifecycle policies", run: testInviteTokenLifecyclePolicies },
    { name: "invite token validation service", run: testInviteTokenValidationService },
    { name: "revoke invite token use case", run: testRevokeInviteTokenUseCase },
    { name: "login guest with invite token and short code", run: testLoginGuestWithInviteTokenUseCase },
    { name: "request admin magic link use case", run: testRequestAdminMagicLinkUseCase },
    { name: "guest session cookie attributes", run: testGuestSessionCookieAttributes },
    { name: "issue guest session use case", run: testIssueGuestSessionUseCase },
  ]);
}
