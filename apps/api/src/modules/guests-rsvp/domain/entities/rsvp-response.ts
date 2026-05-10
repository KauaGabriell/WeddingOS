export const RSVP_RESPONSE_STATUSES = ["yes", "no", "pending"] as const;
export type RsvpResponseStatus = (typeof RSVP_RESPONSE_STATUSES)[number];

export interface Companion {
  id: string;
  rsvpResponseId: string;
  fullName: string;
  createdAt: Date;
}

export interface RsvpResponse {
  id: string;
  eventId: string;
  guestId: string;
  responseStatus: RsvpResponseStatus;
  companionsConfirmed: number;
  companionNames: readonly string[];
  message: string | null;
  respondedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
