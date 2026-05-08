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
import { GUEST_STATUSES } from "../../guests-rsvp/domain/entities/guest.js";

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

const openAccessGuestResponseSchema = z.object({
  id: uuidSchema,
  guestGroupId: uuidSchema,
  fullName: z.string().min(1),
  phone: z.string().min(1).nullable(),
  email: z.string().email().nullable(),
  isPrimary: z.boolean(),
  status: z.enum(GUEST_STATUSES),
  lastAccessAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const openAccessGuestGroupResponseSchema = z.object({
  id: uuidSchema,
  displayName: z.string().min(1),
  groupCode: z.string().min(1),
  allowedCompanions: z.number().int().min(0),
  primaryContactName: z.string().min(1).nullable(),
  primaryContactPhone: z.string().min(1).nullable(),
  primaryContactEmail: z.string().email().nullable(),
  notes: z.string().min(1).nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const openGuestAccessRegistrationResponseSchema = z.object({
  authSession: authSessionResponseSchema,
  guest: openAccessGuestResponseSchema,
  guestGroup: openAccessGuestGroupResponseSchema,
  companions: z.array(openAccessGuestResponseSchema),
  shortCode: z.string().min(4).max(32),
  message: z.string().min(1),
});

const requestAcceptedResponseSchema = z.object({
  accepted: z.literal(true),
});

const logoutSuccessResponseSchema = z.object({
  success: z.literal(true),
});

const adminLoginIdentifierSchema = z
  .string()
  .trim()
  .min(5)
  .max(120)
  .refine((value) => value === "noivos@admin" || z.string().email().safeParse(value).success);

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
    registerOpenGuestAccess: z.object({
      fullName: z.string().trim().min(3).max(120),
      phone: z.string().trim().min(10).max(32),
      companionsCount: z.number().int().min(0).max(12),
      companionNames: z.array(z.string().trim().min(3).max(120)).max(12),
    }),
    adminLogin: z.object({
      email: adminLoginIdentifierSchema,
    }),
    adminLoginVerify: z.object({
      email: adminLoginIdentifierSchema,
      code: z.string().trim().length(8),
    }),
    revokeInviteToken: z.object({
      reason: z.string().trim().min(3).max(255),
    }),
  },
  responses: {
    adminUser: adminUserResponseSchema,
    inviteToken: inviteTokenResponseSchema,
    authSession: authSessionResponseSchema,
    openAccessGuest: openAccessGuestResponseSchema,
    openAccessGuestGroup: openAccessGuestGroupResponseSchema,
    openGuestAccessRegistration: openGuestAccessRegistrationResponseSchema,
    requestAccepted: requestAcceptedResponseSchema,
    logoutSuccess: logoutSuccessResponseSchema,
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
export type IdentityAccessOpenGuestAccessRegistrationResponseDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.responses.openGuestAccessRegistration
>;
export type IdentityAccessRequestAcceptedResponseDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.responses.requestAccepted
>;
export type IdentityAccessLogoutSuccessResponseDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.responses.logoutSuccess
>;
export type IdentityAccessGuestTokenLoginRequestDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.guestTokenLogin
>;
export type IdentityAccessGuestCodeLoginRequestDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.guestCodeLogin
>;
export type IdentityAccessRegisterOpenGuestAccessRequestDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.registerOpenGuestAccess
>;
export type IdentityAccessAdminLoginRequestDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.adminLogin
>;
export type IdentityAccessAdminLoginVerifyRequestDto = z.infer<
  typeof IDENTITY_ACCESS_HTTP_SCHEMAS.bodies.adminLoginVerify
>;
