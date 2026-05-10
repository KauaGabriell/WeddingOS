import type { GuestRepository } from "../domain/index.js";
import { GuestsRsvpApplicationError } from "./guests-rsvp-errors.js";

export interface ManageAdminGuestInput {
  readonly guestId: string;
  readonly fullName?: string;
  readonly phone?: string | null;
  readonly status?: "active" | "inactive";
}

export interface ManageAdminGuestDependencies {
  readonly guestRepository: Pick<GuestRepository, "findById" | "save">;
}

export interface ManageAdminGuestUseCase {
  execute(input: ManageAdminGuestInput): Promise<{
    id: string;
    guestGroupId: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    isPrimary: boolean;
    status: "active" | "inactive";
    lastAccessAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export function createManageAdminGuestUseCase(
  dependencies: ManageAdminGuestDependencies,
): ManageAdminGuestUseCase {
  return {
    async execute(input) {
      const guest = await dependencies.guestRepository.findById(input.guestId);

      if (!guest) {
        throw new GuestsRsvpApplicationError("guest_not_found");
      }

      const normalizedFullName =
        input.fullName === undefined ? guest.fullName : input.fullName.trim();
      const normalizedPhone =
        input.phone === undefined
          ? guest.phone
          : input.phone === null
            ? null
            : input.phone.trim() || null;

      const updatedGuest = {
        ...guest,
        fullName: normalizedFullName,
        phone: normalizedPhone,
        status: input.status ?? guest.status,
        updatedAt: new Date(),
      };

      return dependencies.guestRepository.save(updatedGuest);
    },
  };
}
