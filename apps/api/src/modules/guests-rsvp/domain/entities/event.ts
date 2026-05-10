export const EVENT_TYPES = ["bridal_shower", "wedding"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface EventLocation {
  venueName: string;
  addressLine: string;
  addressNumber: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  eventType: EventType;
  startsAt: Date;
  location: EventLocation;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
