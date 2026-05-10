export const AUDIT_LOG_ACTOR_TYPES = ["admin", "guest", "system"] as const;
export type AuditLogActorType = (typeof AUDIT_LOG_ACTOR_TYPES)[number];

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  actionType: string;
  actorAdminUserId: string | null;
  actorGuestId: string | null;
  actorType: AuditLogActorType;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
