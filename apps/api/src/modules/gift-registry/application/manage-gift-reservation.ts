import type { GiftReservation } from "../domain/entities/gift-reservation.js";
import { GiftReservationConflictError } from "../domain/index.js";
import type { GiftReservationRepository } from "../domain/index.js";
import type { GiftReservationTransactionRunner } from "../infrastructure/index.js";
import type { AuditLogWriter } from "../../admin-backoffice/application/audit-log-writer.js";

export type GiftReservationManagementFailureReason =
  | "reservation_not_found"
  | "reservation_not_active"
  | "admin_user_not_found"
  | "target_guest_not_found"
  | "target_guest_inactive"
  | "target_guest_same_as_current";

export class GiftReservationManagementError extends Error {
  readonly reason: GiftReservationManagementFailureReason;
  readonly statusCode: 403 | 404 | 409;

  constructor(reason: GiftReservationManagementFailureReason) {
    super(`Gift reservation management failed: ${reason}`);
    this.name = "GiftReservationManagementError";
    this.reason = reason;

    switch (reason) {
      case "target_guest_inactive":
        this.statusCode = 403;
        break;
      case "reservation_not_active":
      case "target_guest_same_as_current":
        this.statusCode = 409;
        break;
      default:
        this.statusCode = 404;
        break;
    }
  }
}

export interface ManageGiftReservationInput {
  readonly reservationId: string;
  readonly releasedByAdminUserId: string;
  readonly reason?: string;
  readonly reassignToGuestId?: string;
  readonly requestId?: string;
}

export interface ManageGiftReservationResult {
  readonly releasedReservation: GiftReservation;
  readonly newActiveReservation: GiftReservation | null;
}

export interface ManageGiftReservationUseCase {
  execute(input: ManageGiftReservationInput): Promise<ManageGiftReservationResult>;
}

interface ReservingGuest {
  readonly id: string;
  readonly status: "active" | "inactive";
}

interface AdminUser {
  readonly id: string;
}

export interface ManageGiftReservationDependencies {
  readonly giftReservationRepository: Pick<GiftReservationRepository, "findById">;
  readonly adminUserRepository: {
    findById(id: string): Promise<AdminUser | null>;
  };
  readonly guestRepository: {
    findById(id: string): Promise<ReservingGuest | null>;
  };
  readonly giftReservationTransactionRunner: GiftReservationTransactionRunner;
  readonly auditLogWriter: AuditLogWriter;
}

function normalizeGuestId(guestId?: string): string | undefined {
  const normalized = guestId?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function createManageGiftReservationUseCase(
  dependencies: ManageGiftReservationDependencies,
): ManageGiftReservationUseCase {
  return {
    async execute(input) {
      const reservation = await dependencies.giftReservationRepository.findById(input.reservationId);

      if (reservation === null) {
        throw new GiftReservationManagementError("reservation_not_found");
      }

      if (reservation.reservationStatus !== "active") {
        throw new GiftReservationManagementError("reservation_not_active");
      }

      const adminUser = await dependencies.adminUserRepository.findById(input.releasedByAdminUserId);

      if (adminUser === null) {
        throw new GiftReservationManagementError("admin_user_not_found");
      }

      const reassignToGuestId = normalizeGuestId(input.reassignToGuestId);
      let targetGuest: ReservingGuest | null = null;

      if (reassignToGuestId !== undefined) {
        if (reassignToGuestId === reservation.guestId) {
          throw new GiftReservationManagementError("target_guest_same_as_current");
        }

        targetGuest = await dependencies.guestRepository.findById(reassignToGuestId);

        if (targetGuest === null) {
          throw new GiftReservationManagementError("target_guest_not_found");
        }

        if (targetGuest.status !== "active") {
          throw new GiftReservationManagementError("target_guest_inactive");
        }
      }

      const result = await dependencies.giftReservationTransactionRunner.run(async (context) => {
        const currentReservation = await context.findReservationById(reservation.id);

        if (currentReservation === null) {
          throw new GiftReservationManagementError("reservation_not_found");
        }

        if (currentReservation.reservationStatus !== "active") {
          throw new GiftReservationManagementError("reservation_not_active");
        }

        const releasedReservation = await context.releaseActiveReservation({
          reservationId: currentReservation.id,
          releasedByAdminUserId: adminUser.id,
        });

        if (targetGuest === null) {
          return {
            releasedReservation,
            newActiveReservation: null,
          };
        }

        try {
          const newActiveReservation = await context.createActiveReservation({
            giftId: currentReservation.giftId,
            guestId: targetGuest.id,
          });

          return {
            releasedReservation,
            newActiveReservation,
          };
        } catch (error) {
          if (error instanceof GiftReservationConflictError) {
            throw error;
          }

          throw error;
        }
      });

      await dependencies.auditLogWriter.write({
        entityType: "gift_reservation",
        entityId: result.newActiveReservation?.id ?? result.releasedReservation.id,
        actionType:
          result.newActiveReservation === null
            ? "GIFT_RESERVATION_RELEASED"
            : "GIFT_RESERVATION_REASSIGNED",
        actorType: "admin",
        actorAdminUserId: adminUser.id,
        requestId: input.requestId,
        metadata: {
          releasedReservationId: result.releasedReservation.id,
          newActiveReservationId: result.newActiveReservation?.id ?? null,
          giftId: result.releasedReservation.giftId,
          previousGuestId: result.releasedReservation.guestId,
          newGuestId: result.newActiveReservation?.guestId ?? null,
          reason: input.reason?.trim() || null,
        },
      });

      return result;
    },
  };
}
