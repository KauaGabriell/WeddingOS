import assert from "node:assert/strict";
import {
  PrismaAuditLogRepository,
} from "../../modules/admin-backoffice/index.js";
import { runNamedTests } from "../test-helpers.js";

const persistedAuditLog = {
  id: "audit-1",
  entityType: "gift",
  entityId: "gift-1",
  actionType: "GIFT_UPDATED",
  actorAdminUserId: "admin-1",
  actorGuestId: null,
  actorType: "ADMIN" as const,
  requestId: "req-1",
  metadata: { status: "available" },
  createdAt: new Date("2026-05-06T10:00:00.000Z"),
};

async function testPrismaAuditLogRepositoryFindByIdMapsRecord(): Promise<void> {
  const repository = new PrismaAuditLogRepository({
    async findUnique() {
      return persistedAuditLog;
    },
    async findMany() {
      return [];
    },
    async upsert() {
      return persistedAuditLog;
    },
  });

  const result = await repository.findById("audit-1");

  assert.equal(result?.actorType, "admin");
  assert.deepEqual(result?.metadata, { status: "available" });
}

async function testPrismaAuditLogRepositoryFindManyAppliesFiltersAndPagination(): Promise<void> {
  const repository = new PrismaAuditLogRepository({
    async findUnique() {
      return null;
    },
    async findMany(args) {
      assert.deepEqual(args.where, {
        actorType: "GUEST",
        entityType: "photo_post",
        entityId: "post-1",
        actionType: "PHOTO_POST_SUBMITTED",
        requestId: "req-1",
      });
      assert.deepEqual(args.orderBy, [{ createdAt: "desc" }]);
      assert.equal(args.skip, 5);
      assert.equal(args.take, 5);
      return [persistedAuditLog];
    },
    async upsert() {
      return persistedAuditLog;
    },
  });

  const results = await repository.findMany({
    actorType: "guest",
    entityType: "photo_post",
    entityId: "post-1",
    actionType: "PHOTO_POST_SUBMITTED",
    requestId: "req-1",
    page: 2,
    pageSize: 5,
  });

  assert.equal(results[0]?.id, "audit-1");
}

async function testPrismaAuditLogRepositorySavePersistsMetadataAndRequestId(): Promise<void> {
  const repository = new PrismaAuditLogRepository({
    async findUnique() {
      return null;
    },
    async findMany() {
      return [];
    },
    async upsert(args) {
      assert.equal(args.create.actorType, "GUEST");
      assert.equal(args.create.requestId, "req-1");
      assert.deepEqual(args.create.metadata, { inviteTokenId: "invite-1" });
      return {
        ...persistedAuditLog,
        id: args.create.id,
        entityType: args.create.entityType,
        entityId: args.create.entityId,
        actionType: args.create.actionType,
        actorAdminUserId: args.create.actorAdminUserId,
        actorGuestId: args.create.actorGuestId,
        actorType: args.create.actorType,
        requestId: args.create.requestId,
        metadata: args.create.metadata,
        createdAt: args.create.createdAt,
      };
    },
  });

  const result = await repository.save({
    id: "audit-2",
    entityType: "guest",
    entityId: "guest-1",
    actionType: "GUEST_LOGGED_IN",
    actorAdminUserId: null,
    actorGuestId: "guest-1",
    actorType: "guest",
    requestId: "req-1",
    metadata: { inviteTokenId: "invite-1" },
    createdAt: new Date("2026-05-06T11:00:00.000Z"),
  });

  assert.equal(result.actorType, "guest");
  assert.equal(result.requestId, "req-1");
}

export async function runAdminBackofficeInfrastructureTests(): Promise<void> {
  await runNamedTests("admin-backoffice/infrastructure", [
    { name: "prisma audit log repository maps findById", run: testPrismaAuditLogRepositoryFindByIdMapsRecord },
    { name: "prisma audit log repository applies filters and pagination", run: testPrismaAuditLogRepositoryFindManyAppliesFiltersAndPagination },
    { name: "prisma audit log repository persists metadata and request id", run: testPrismaAuditLogRepositorySavePersistsMetadataAndRequestId },
  ]);
}
