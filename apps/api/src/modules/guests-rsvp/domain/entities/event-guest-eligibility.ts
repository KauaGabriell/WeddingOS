export interface EventGuestEligibility {
  id: string;
  eventId: string;
  guestId: string;
  canRsvp: boolean;
  createdAt: Date;
}
