import type {
  Gift,
  GiftRepository,
  GiftReservation,
} from "../domain/index.js";
import { GiftReservationConflictError } from "../domain/index.js";
import type { GiftReservationTransactionRunner } from "../infrastructure/index.js";
import { GiftRegistryApplicationError } from "./gift-registry-errors.js";

export interface ReserveGiftInput {
  readonly giftId: string;
  readonly guestId: string;
  readonly purchaseNotes?: string;
}

export interface ReserveGiftUseCase {
  execute(input: ReserveGiftInput): Promise<GiftReservation>;
}

interface ReserveGiftGuest {
  readonly id: string;
  readonly status: "active" | "inactive";
}

export interface ReserveGiftDependencies {
  readonly guestRepository: {
    findById(id: string): Promise<ReserveGiftGuest | null>;
  };
  readonly giftRepository: Pick<GiftRepository, "findById">;
  readonly giftReservationTransactionRunner: GiftReservationTransactionRunner;
}

function assertReservableGift(gift: Gift | null): Gift {
  if (gift === null) {
    throw new GiftRegistryApplicationError("gift_not_found");
  }

  if (!gift.isActive) {
    throw new GiftRegistryApplicationError("gift_inactive");
  }

  if (gift.status !== "available") {
    throw new GiftRegistryApplicationError("gift_unavailable");
  }

  return gift;
}

function normalizePurchaseNotes(purchaseNotes?: string): string | undefined {
  const normalized = purchaseNotes?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function createReserveGiftUseCase(
  dependencies: ReserveGiftDependencies,
): ReserveGiftUseCase {
  return {
    async execute(input) {
      const guest = await dependencies.guestRepository.findById(input.guestId);

      if (guest === null) {
        throw new GiftRegistryApplicationError("guest_not_found");
      }

      if (guest.status !== "active") {
        throw new GiftRegistryApplicationError("guest_inactive");
      }

      const gift = assertReservableGift(await dependencies.giftRepository.findById(input.giftId));
      const purchaseNotes = normalizePurchaseNotes(input.purchaseNotes);

      return dependencies.giftReservationTransactionRunner.run(async (context) => {
        const activeReservation = await context.findActiveReservationByGiftId(gift.id);

        if (activeReservation !== null) {
          throw new GiftReservationConflictError(gift.id);
        }

        return context.createActiveReservation({
          giftId: gift.id,
          guestId: guest.id,
          purchaseNotes,
        });
      });
    },
  };
}
