import type {
  EventGuestEligibility,
  Guest,
  GuestGroup,
  RsvpResponse,
} from "../domain/index.js";

export interface ListAdminGuestsAndRsvpsInput {
  readonly eventId?: string;
  readonly guestGroupId?: string;
  readonly guestStatus?: Guest["status"];
  readonly responseStatus?: RsvpResponse["responseStatus"];
  readonly search?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface AdminGuestRsvpRow {
  readonly guest: Guest;
  readonly guestGroup: GuestGroup;
  readonly eligibility: readonly EventGuestEligibility[];
  readonly responses: readonly RsvpResponse[];
}

export interface ListAdminGuestsAndRsvpsResult {
  readonly items: readonly AdminGuestRsvpRow[];
  readonly page: number;
  readonly pageSize: number;
}
