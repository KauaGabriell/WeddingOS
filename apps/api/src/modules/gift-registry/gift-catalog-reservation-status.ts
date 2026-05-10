export const GIFT_CATALOG_RESERVATION_STATUSES = ["available", "reserved"] as const;
export type GiftCatalogReservationStatus = (typeof GIFT_CATALOG_RESERVATION_STATUSES)[number];
