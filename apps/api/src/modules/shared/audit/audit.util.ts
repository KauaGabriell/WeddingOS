import { AuditLog, AuditActionType, AuditActor, AuditMetadata } from "./audit.types.js"

export function createAuditLog(params: {
  action: AuditActionType
  actor?: AuditActor
  metadata?: AuditMetadata
}): AuditLog {
  return {
    timestamp: new Date().toISOString(),
    action: params.action,
    actor: params.actor ?? {},
    metadata: params.metadata
  }
}
