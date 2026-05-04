import type { Gift, GiftReservation } from "../domain/index.js";
import type { GiftCatalogReservationStatus } from "../gift-catalog-reservation-status.js";

export interface ListPublicGiftCatalogInput {
  readonly category?: string;
  readonly status?: Gift["status"];
  readonly reservationStatus?: GiftCatalogReservationStatus;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface GiftCatalogItem {
  readonly gift: Gift;
  readonly activeReservation: GiftReservation | null;
}

export interface ListPublicGiftCatalogResult {
  readonly items: readonly GiftCatalogItem[];
  readonly page: number;
  readonly pageSize: number;
}
