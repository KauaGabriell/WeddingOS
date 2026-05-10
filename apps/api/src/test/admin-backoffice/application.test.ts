import assert from "node:assert/strict";
import {
  AuditLogWriterError,
  createAuditLogWriter,
} from "../../modules/admin-backoffice/index.js";
import { runNamedTests } from "../test-helpers.js";

async function testAuditLogWriterCreatesGuestAuditLog(): Promise<void> {
  const writer = createAuditLogWriter({
    auditLogRepository: {
      async save(entity) {
        assert.match(entity.id, /^[0-9a-f-]{36}$/);
        assert.equal(entity.entityType, "guest");
        assert.equal(entity.entityId, "guest-1");
        assert.equal(entity.actionType, "GUEST_LOGGED_IN");
        assert.equal(entity.actorType, "guest");
        assert.equal(entity.actorGuestId, "guest-1");
        assert.equal(entity.actorAdminUserId, null);
        assert.equal(entity.requestId, "req-1");
        assert.deepEqual(entity.metadata, { inviteTokenId: "invite-1" });
        assert.ok(entity.createdAt instanceof Date);
        return entity;
      },
    },
  });

  const result = await writer.write({
    entityType: "guest",
    entityId: "guest-1",
    actionType: "GUEST_LOGGED_IN",
    actorType: "guest",
    actorGuestId: "guest-1",
    requestId: "req-1",
    metadata: { inviteTokenId: "invite-1" },
  });

  assert.equal(result.actorType, "guest");
}

async function testAuditLogWriterCreatesAdminAuditLog(): Promise<void> {
  const writer = createAuditLogWriter({
    auditLogRepository: {
      async save(entity) {
        assert.equal(entity.actorType, "admin");
        assert.equal(entity.actorAdminUserId, "admin-1");
        assert.equal(entity.actorGuestId, null);
        return entity;
      },
    },
  });

  const result = await writer.write({
    entityType: "gift",
    entityId: "gift-1",
    actionType: "GIFT_UPDATED",
    actorType: "admin",
    actorAdminUserId: "admin-1",
  });

  assert.equal(result.actorAdminUserId, "admin-1");
}

async function testAuditLogWriterRejectsInconsistentActorShape(): Promise<void> {
  const writer = createAuditLogWriter({
    auditLogRepository: {
      async save() {
        throw new Error("should not persist");
      },
    },
  });

  await assert.rejects(
    () =>
      writer.write({
        entityType: "gift",
        entityId: "gift-1",
        actionType: "GIFT_UPDATED",
        actorType: "guest",
      }),
    (error) => {
      assert.ok(error instanceof AuditLogWriterError);
      assert.equal(error.reason, "guest_actor_id_required");
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
}

export async function runAdminBackofficeApplicationTests(): Promise<void> {
  await runNamedTests("admin-backoffice/application", [
    { name: "audit log writer creates guest audit log", run: testAuditLogWriterCreatesGuestAuditLog },
    { name: "audit log writer creates admin audit log", run: testAuditLogWriterCreatesAdminAuditLog },
    { name: "audit log writer rejects inconsistent actor shape", run: testAuditLogWriterRejectsInconsistentActorShape },
  ]);
}
