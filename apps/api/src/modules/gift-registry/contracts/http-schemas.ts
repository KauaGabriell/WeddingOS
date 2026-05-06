import { z } from "zod";
import {
  defineHttpSchemaCatalog,
  isoDateTimeSchema,
  paginatedItemsResponseSchema,
  paginationQuerySchema,
  uuidSchema,
} from "../../shared/platform/http/http-contracts.js";
import { GIFT_CATALOG_RESERVATION_STATUSES } from "../gift-catalog-reservation-status.js";
import { GIFT_STATUSES } from "../domain/entities/gift.js";
import { GIFT_RESERVATION_STATUSES } from "../domain/entities/gift-reservation.js";

const giftResponseSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1).nullable(),
  estimatedValue: z.number().nonnegative().nullable(),
  imageUrl: z.string().url().nullable(),
  displayOrder: z.number().int().min(0),
  status: z.enum(GIFT_STATUSES),
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const giftReservationResponseSchema = z.object({
  id: uuidSchema,
  giftId: uuidSchema,
  guestId: uuidSchema,
  reservationStatus: z.enum(GIFT_RESERVATION_STATUSES),
  purchaseNotes: z.string().min(1).nullable(),
  reservedAt: isoDateTimeSchema,
  releasedAt: isoDateTimeSchema.nullable(),
  releasedByAdminUserId: uuidSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const giftCatalogItemResponseSchema = z.object({
  gift: giftResponseSchema,
  activeReservation: giftReservationResponseSchema.nullable(),
});

export const GIFT_REGISTRY_HTTP_SCHEMAS = defineHttpSchemaCatalog({
  params: {
    giftId: z.object({
      giftId: uuidSchema,
    }),
    reservationId: z.object({
      reservationId: uuidSchema,
    }),
  },
  queries: {
    giftCatalog: paginationQuerySchema.extend({
      category: z.string().trim().min(1).optional(),
      status: z.enum(GIFT_STATUSES).optional(),
      reservationStatus: z.enum(GIFT_CATALOG_RESERVATION_STATUSES).optional(),
      minEstimatedValue: z.coerce.number().nonnegative().optional(),
      maxEstimatedValue: z.coerce.number().nonnegative().optional(),
    }),
  },
  bodies: {
    reserveGift: z.object({
      guestId: uuidSchema,
      purchaseNotes: z.string().trim().max(500).optional(),
    }),
    upsertGift: z.object({
      name: z.string().trim().min(1).max(255),
      category: z.string().trim().min(1).max(120),
      description: z.string().trim().max(1_000).optional(),
      estimatedValue: z.number().nonnegative().optional(),
      imageUrl: z.string().url().optional(),
      displayOrder: z.number().int().min(0),
      status: z.enum(GIFT_STATUSES),
      isActive: z.boolean(),
    }),
    releaseReservation: z.object({
      releasedByAdminUserId: uuidSchema,
      reassignToGuestId: uuidSchema.optional(),
      reason: z.string().trim().max(255).optional(),
    }),
  },
  responses: {
    gift: giftResponseSchema,
    giftReservation: giftReservationResponseSchema,
    giftCatalogItem: giftCatalogItemResponseSchema,
    giftCatalogList: paginatedItemsResponseSchema(giftCatalogItemResponseSchema),
    adminGiftList: paginatedItemsResponseSchema(giftResponseSchema),
  },
});

export type GiftRegistryGiftResponseDto = z.infer<
  typeof GIFT_REGISTRY_HTTP_SCHEMAS.responses.gift
>;
export type GiftRegistryGiftReservationResponseDto = z.infer<
  typeof GIFT_REGISTRY_HTTP_SCHEMAS.responses.giftReservation
>;
export type GiftRegistryGiftCatalogItemResponseDto = z.infer<
  typeof GIFT_REGISTRY_HTTP_SCHEMAS.responses.giftCatalogItem
>;
export type GiftRegistryGiftCatalogListResponseDto = z.infer<
  typeof GIFT_REGISTRY_HTTP_SCHEMAS.responses.giftCatalogList
>;
export type GiftRegistryAdminGiftListResponseDto = z.infer<
  typeof GIFT_REGISTRY_HTTP_SCHEMAS.responses.adminGiftList
>;
export type GiftRegistryReserveGiftRequestDto = z.infer<
  typeof GIFT_REGISTRY_HTTP_SCHEMAS.bodies.reserveGift
>;
export type GiftRegistryUpsertGiftRequestDto = z.infer<
  typeof GIFT_REGISTRY_HTTP_SCHEMAS.bodies.upsertGift
>;
export type GiftRegistryGiftCatalogQueryDto = z.infer<
  typeof GIFT_REGISTRY_HTTP_SCHEMAS.queries.giftCatalog
>;
