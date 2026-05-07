const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Erro na requisição");
  }

  return response.json() as Promise<T>;
}

export type EventType = "bridal_shower" | "wedding";
export type RsvpResponseStatus = "yes" | "no" | "pending";

export interface GuestGroupDto {
  id: string;
  displayName: string;
  groupCode: string;
  allowedCompanions: number;
  primaryContactName: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuestDto {
  id: string;
  guestGroupId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  status: "active" | "inactive";
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventLocationDto {
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

export interface EventDto {
  id: string;
  slug: string;
  name: string;
  eventType: EventType;
  startsAt: string;
  location: EventLocationDto;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventGuestEligibilityDto {
  id: string;
  eventId: string;
  guestId: string;
  canRsvp: boolean;
  createdAt: string;
}

export interface RsvpResponseDto {
  id: string;
  eventId: string;
  guestId: string;
  responseStatus: RsvpResponseStatus;
  companionsConfirmed: number;
  message: string | null;
  respondedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuestHomeDto {
  guestGroup: GuestGroupDto;
  guests: GuestDto[];
  events: EventDto[];
  eligibility: EventGuestEligibilityDto[];
  responses: RsvpResponseDto[];
}

export interface EventListDto {
  items: EventDto[];
  page: number;
  pageSize: number;
}

export const authApi = {
  loginWithToken: (token: string) =>
    apiFetch("/auth/guest/login/token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  loginWithCode: (code: string) =>
    apiFetch("/auth/guest/login/code", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};

export const guestApi = {
  getHome: () => apiFetch<GuestHomeDto>("/guest/home"),
  listEvents: () => apiFetch<EventListDto>("/events?page=1&pageSize=10"),
};
