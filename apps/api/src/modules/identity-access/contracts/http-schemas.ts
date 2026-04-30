import { z } from "zod";
import {
  defineHttpSchemaCatalog,
  isoDateTimeSchema,
  uuidSchema,
} from "../../shared/platform/http/http-contracts.js";
import {
  ADMIN_USER_ROLES,
  ADMIN_USER_STATUSES,
} from "../domain/entities/admin-user.js";
import {
  INVITE_TOKEN_CHANNELS,
  INVITE_TOKEN_STATUSES,
} from "../domain/entities/invite-token.js";

const adminUserResponseSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  email: z.string().email(),
  authProvider: z.string().min(1),
  role: z.enum(ADMIN_USER_ROLES),
  status: z.enum(ADMIN_USER_STATUSES),
  lastLoginAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const inviteTokenResponseSchema = z.object({
  id: uuidSchema,
  guestGroupId: uuidSchema.nullable(),
  guestId: uuidSchema.nullable(),
  tokenHash: z.string().min(1),
  shortCode: z.string().min(1).nullable(),
  channel: z.enum(INVITE_TOKEN_CHANNELS),
  status: z.enum(INVITE_TOKEN_STATUSES),
  issuedAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  usedAt: isoDateTimeSchema.nullable(),
  revokedAt: isoDateTimeSchema.nullable(),
  revokedReason: z.string().min(1).nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const authSessionResponseSchema = z.object({
  actorType: z.enum(["guest", "admin"]),
  actorId: uuidSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).nullable(),
  expiresAt: isoDateTimeSchema,
});

export const IDENTITY_ACCESS_HTTP_SCHEMAS = defineHttpSchemaCatalog({
  params: {
    inviteTokenId: z.object({
      inviteTokenId: uuidSchema,
    }),
  },
  queries: {},
  bodies: {
    guestTokenLogin: z.object({
      token: z.string().min(1),
    }),
    guestCodeLogin: z.object({
      code: z.string().trim().min(4).max(32),
    }),
    adminLogin: z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }),
    revokeInviteToken: z.object({
      reason: z.string().trim().min(3).max(255),
    }),
  },
  responses: {
    adminUser: adminUserResponseSchema,
    inviteToken: inviteTokenResponseSchema,
    authSession: authSessionResponseSchema,
  },
});

export type IdentityAccessAdminUserResponseDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.responses.adminUser
>;
export type IdentityAccessInviteTokenResponseDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.responses.inviteToken
>;
export type IdentityAccessAuthSessionResponseDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.responses.authSession
>;
export type IdentityAccessGuestTokenLoginRequestDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.guestTokenLogin
>;
export type IdentityAccessGuestCodeLoginRequestDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.guestCodeLogin
>;
export type IdentityAccessAdminLoginRequestDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.adminLogin
>;
