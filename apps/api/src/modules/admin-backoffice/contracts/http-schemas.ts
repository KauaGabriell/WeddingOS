import { z } from "zod";
import {
  defineHttpSchemaCatalog,
  isoDateTimeSchema,
  paginationQuerySchema,
  sortDirectionSchema,
  uuidSchema,
} from "../../shared/platform/http/http-contracts.js";
import { AUDIT_LOG_ACTOR_TYPES } from "../domain/entities/audit-log.js";

const auditLogResponseSchema = z.object({
  id: uuidSchema,
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  actionType: z.string().min(1),
  actorAdminUserId: uuidSchema.nullable(),
  actorGuestId: uuidSchema.nullable(),
  actorType: z.enum(AUDIT_LOG_ACTOR_TYPES),
  requestId: z.string().min(1).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: isoDateTimeSchema,
});

export const ADMIN_BACKOFFICE_HTTP_SCHEMAS = defineHttpSchemaCatalog({
  params: {
    auditLogId: z.object({
      auditLogId: uuidSchema,
    }),
  },
  queries: {
    auditLogList: paginationQuerySchema.extend({
      actorType: z.enum(AUDIT_LOG_ACTOR_TYPES).optional(),
      entityType: z.string().trim().min(1).optional(),
      entityId: z.string().trim().min(1).optional(),
      actionType: z.string().trim().min(1).optional(),
      requestId: z.string().trim().min(1).optional(),
      direction: sortDirectionSchema,
    }),
  },
  bodies: {
    createAuditLog: z.object({
      entityType: z.string().trim().min(1).max(120),
      entityId: z.string().trim().min(1).max(120),
      actionType: z.string().trim().min(1).max(120),
      actorAdminUserId: uuidSchema.optional(),
      actorGuestId: uuidSchema.optional(),
      actorType: z.enum(AUDIT_LOG_ACTOR_TYPES),
      requestId: z.string().trim().min(1).max(120).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  },
  responses: {
    auditLog: auditLogResponseSchema,
  },
});

export type AdminBackofficeAuditLogResponseDto = z.infer<
  typeof ADMIN_BACKOFFICE_HTTP_SCHEMAS.responses.auditLog
>;
export type AdminBackofficeCreateAuditLogRequestDto = z.infer<
  typeof ADMIN_BACKOFFICE_HTTP_SCHEMAS.bodies.createAuditLog
>;
