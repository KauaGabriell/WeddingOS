import type { GiftReservation, GiftReservationStatus } from "../entities/gift-reservation.js";
import type {
  EntityRepository,
  ListableRepository,
  PaginationQuery,
} from "../../../shared/repository-contracts.js";

export interface GiftReservationRepositoryFilters extends PaginationQuery {
  readonly giftId?: string;
  readonly guestId?: string;
  readonly reservationStatus?: GiftReservationStatus;
}

export interface GiftReservationRepository
  extends EntityRepository<GiftReservation>,
    ListableRepository<GiftReservation, GiftReservationRepositoryFilters> {
  findActiveByGiftId(giftId: string): Promise<GiftReservation | null>;
}
