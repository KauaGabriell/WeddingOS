import { z } from "zod";
import {
  defineHttpSchemaCatalog,
  isoDateTimeSchema,
  paginationQuerySchema,
  uuidSchema,
} from "../../shared/platform/http/http-contracts.js";
import { EVENT_TYPES } from "../domain/entities/event.js";
import { GUEST_STATUSES } from "../domain/entities/guest.js";
import { RSVP_RESPONSE_STATUSES } from "../domain/entities/rsvp-response.js";

const guestGroupResponseSchema = z.object({
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

const guestResponseSchema = z.object({
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

const eventLocationResponseSchema = z.object({
  venueName: z.string().min(1),
  addressLine: z.string().min(1),
  addressNumber: z.string().min(1).nullable(),
  neighborhood: z.string().min(1).nullable(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1).nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  mapUrl: z.string().url().nullable(),
});

const eventResponseSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  eventType: z.enum(EVENT_TYPES),
  startsAt: isoDateTimeSchema,
  location: eventLocationResponseSchema,
  notes: z.string().min(1).nullable(),
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const eventGuestEligibilityResponseSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  guestId: uuidSchema,
  canRsvp: z.boolean(),
  createdAt: isoDateTimeSchema,
});

const rsvpResponseSchema = z.object({
  id: uuidSchema,
  eventId: uuidSchema,
  guestId: uuidSchema,
  responseStatus: z.enum(RSVP_RESPONSE_STATUSES),
  companionsConfirmed: z.number().int().min(0),
  message: z.string().min(1).nullable(),
  respondedAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const guestHomeResponseSchema = z.object({
  guestGroup: guestGroupResponseSchema,
  guests: z.array(guestResponseSchema),
  events: z.array(eventResponseSchema),
  eligibility: z.array(eventGuestEligibilityResponseSchema),
  responses: z.array(rsvpResponseSchema),
});

export const GUESTS_RSVP_HTTP_SCHEMAS = defineHttpSchemaCatalog({
  params: {
    guestId: z.object({
      guestId: uuidSchema,
    }),
    guestGroupId: z.object({
      guestGroupId: uuidSchema,
    }),
    eventId: z.object({
      eventId: uuidSchema,
    }),
  },
  queries: {
    guestList: paginationQuerySchema.extend({
      eventId: uuidSchema.optional(),
      guestGroupId: uuidSchema.optional(),
      status: z.enum(GUEST_STATUSES).optional(),
      search: z.string().trim().min(1).optional(),
    }),
    adminGuestList: paginationQuerySchema.extend({
      eventId: uuidSchema.optional(),
      guestGroupId: uuidSchema.optional(),
      status: z.enum(GUEST_STATUSES).optional(),
      search: z.string().trim().min(1).optional(),
    }),
    adminRsvpList: paginationQuerySchema.extend({
      eventId: uuidSchema.optional(),
      guestGroupId: uuidSchema.optional(),
      responseStatus: z.enum(RSVP_RESPONSE_STATUSES).optional(),
      search: z.string().trim().min(1).optional(),
    }),
    eventList: paginationQuerySchema.extend({
      eventType: z.enum(EVENT_TYPES).optional(),
      isActive: z.coerce.boolean().optional(),
    }),
  },
  bodies: {
    submitRsvp: z.object({
      eventId: uuidSchema,
      guestId: uuidSchema,
      responseStatus: z.enum(RSVP_RESPONSE_STATUSES),
      companionsConfirmed: z.number().int().min(0),
      message: z.string().trim().max(500).optional(),
    }),
  },
  responses: {
    guestGroup: guestGroupResponseSchema,
    guest: guestResponseSchema,
    eventLocation: eventLocationResponseSchema,
    event: eventResponseSchema,
    eventGuestEligibility: eventGuestEligibilityResponseSchema,
    rsvpResponse: rsvpResponseSchema,
    guestHome: guestHomeResponseSchema,
  },
});

export type GuestsRsvpGuestGroupResponseDto = z.infer<
  typeof GUESTS_RSVP_HTTP_SCHEMAS.responses.guestGroup
>;
export type GuestsRsvpGuestResponseDto = z.infer<
  typeof GUESTS_RSVP_HTTP_SCHEMAS.responses.guest
>;
export type GuestsRsvpEventResponseDto = z.infer<
  typeof GUESTS_RSVP_HTTP_SCHEMAS.responses.event
>;
export type GuestsRsvpEventGuestEligibilityResponseDto = z.infer<
  typeof GUESTS_RSVP_HTTP_SCHEMAS.responses.eventGuestEligibility
>;
export type GuestsRsvpRsvpResponseDto = z.infer<
  typeof GUESTS_RSVP_HTTP_SCHEMAS.responses.rsvpResponse
>;
export type GuestsRsvpSubmitRsvpRequestDto = z.infer<
  typeof GUESTS_RSVP_HTTP_SCHEMAS.bodies.submitRsvp
>;
export type GuestsRsvpAdminGuestListQueryDto = z.infer<
  typeof GUESTS_RSVP_HTTP_SCHEMAS.queries.adminGuestList
>;
export type GuestsRsvpAdminRsvpListQueryDto = z.infer<
  typeof GUESTS_RSVP_HTTP_SCHEMAS.queries.adminRsvpList
>;
