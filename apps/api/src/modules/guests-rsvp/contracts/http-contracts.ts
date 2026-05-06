export type {
  GuestsRsvpAdminGuestListQueryDto,
  GuestsRsvpAdminRsvpListQueryDto,
} from "./http-schemas.js";

export interface GuestsRsvpHttpContract {
  readonly module: "guests-rsvp";
  readonly routePrefix: "/";
  readonly tags: readonly ["guests-rsvp"];
}

export const GUESTS_RSVP_HTTP_CONTRACT: GuestsRsvpHttpContract = {
  module: "guests-rsvp",
  routePrefix: "/",
  tags: ["guests-rsvp"],
};
