import { randomUUID } from "node:crypto";
import type { AuditLog, AuditLogActorType } from "../domain/entities/audit-log.js";
import type { AuditLogRepository } from "../domain/repositories/audit-log-repository.js";

export type AuditLogWriterFailureReason =
  | "admin_actor_id_required"
  | "guest_actor_id_required";

export class AuditLogWriterError extends Error {
  readonly reason: AuditLogWriterFailureReason;
  readonly statusCode = 400;

  constructor(reason: AuditLogWriterFailureReason) {
    super(`Audit log write failed: ${reason}`);
    this.name = "AuditLogWriterError";
    this.reason = reason;
  }
}

export interface WriteAuditLogInput {
  readonly entityType: string;
  readonly entityId: string;
  readonly actionType: string;
  readonly actorType: AuditLogActorType;
  readonly actorAdminUserId?: string;
  readonly actorGuestId?: string;
  readonly requestId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface AuditLogWriter {
  write(input: WriteAuditLogInput): Promise<AuditLog>;
}

export interface AuditLogWriterDependencies {
  readonly auditLogRepository: Pick<AuditLogRepository, "save">;
}

function normalizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | null {
  if (metadata === undefined) {
    return null;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function normalizeActor(
  input: WriteAuditLogInput,
): Pick<AuditLog, "actorType" | "actorAdminUserId" | "actorGuestId"> {
  switch (input.actorType) {
    case "admin":
      if (!input.actorAdminUserId) {
        throw new AuditLogWriterError("admin_actor_id_required");
      }

      return {
        actorType: "admin",
        actorAdminUserId: input.actorAdminUserId,
        actorGuestId: null,
      };
    case "guest":
      if (!input.actorGuestId) {
        throw new AuditLogWriterError("guest_actor_id_required");
      }

      return {
        actorType: "guest",
        actorAdminUserId: null,
        actorGuestId: input.actorGuestId,
      };
    case "system":
      return {
        actorType: "system",
        actorAdminUserId: null,
        actorGuestId: null,
      };
  }
}

export function createAuditLogWriter(
  dependencies: AuditLogWriterDependencies,
): AuditLogWriter {
  return {
    async write(input) {
      const now = new Date();

      return dependencies.auditLogRepository.save({
        id: randomUUID(),
        entityType: input.entityType.trim(),
        entityId: input.entityId.trim(),
        actionType: input.actionType.trim(),
        ...normalizeActor(input),
        requestId: input.requestId?.trim() || null,
        metadata: normalizeMetadata(input.metadata),
        createdAt: now,
      });
    },
  };
}
