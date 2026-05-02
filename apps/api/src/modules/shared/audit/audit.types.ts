export type AuditActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "ACCESS"
  | "ERROR"

export type AuditActor = {
  userId?: string
  role?: string
  ip?: string
  userAgent?: string
}

export type AuditMetadata = {
  entity?: string
  entityId?: string
  description?: string
  changes?: Record<string, unknown>
}

export type AuditLog = {
  timestamp: string
  action: AuditActionType
  actor: AuditActor
  metadata?: AuditMetadata
}
