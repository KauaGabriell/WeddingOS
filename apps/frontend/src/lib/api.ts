const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
export const GUEST_ACCESS_CODE_STORAGE_KEY = "weddingos_guest_access_code";

export class ApiRequestError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

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
    throw new ApiRequestError(
      errorData.message || "Erro na requisicao",
      response.status,
      typeof errorData.code === "string" ? errorData.code : undefined,
    );
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
  accessCode: string | null;
}

export interface EventListDto {
  items: EventDto[];
  page: number;
  pageSize: number;
}

export interface SubmitRsvpResultDto {
  persistedResponse: RsvpResponseDto;
  outcome: "created" | "updated" | "replayed";
}

export type GiftStatus = "available" | "reserved";

export interface GiftDto {
  id: string;
  name: string;
  category: string;
  description: string | null;
  estimatedValue: number | null;
  imageUrl: string | null;
  displayOrder: number;
  status: "available" | "reserved" | "archived";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GiftReservationDto {
  id: string;
  giftId: string;
  guestId: string;
  reservationStatus: "active" | "released";
  purchaseNotes: string | null;
  reservedAt: string;
  releasedAt: string | null;
  releasedByAdminUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCatalogItemDto {
  gift: GiftDto;
  activeReservation: GiftReservationDto | null;
}

export interface GiftCatalogListDto {
  items: GiftCatalogItemDto[];
  page: number;
  pageSize: number;
}

export interface GiftReservationResultDto {
  id: string;
  giftId: string;
  guestId: string;
  reservationStatus: "active" | "released";
  purchaseNotes: string | null;
  reservedAt: string;
  releasedAt: string | null;
  releasedByAdminUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionDto {
  actorType: "guest" | "admin";
  actorId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

export interface OpenGuestAccessRegistrationDto {
  authSession: AuthSessionDto;
  guest: GuestDto;
  guestGroup: GuestGroupDto;
  companions: GuestDto[];
  shortCode: string;
  message: string;
}

export interface AdminGuestRowDto {
  guestGroup: GuestGroupDto;
  guest: GuestDto;
  eligibility: EventGuestEligibilityDto[];
  responses: RsvpResponseDto[];
}

export interface AdminGuestListDto {
  items: AdminGuestRowDto[];
  page: number;
  pageSize: number;
}

type ListEventsParams = {
  eventType?: EventType;
  page?: number;
  pageSize?: number;
};

type ListGiftsParams = {
  category?: string;
  reservationStatus?: GiftStatus;
  minEstimatedValue?: number;
  maxEstimatedValue?: number;
  page?: number;
  pageSize?: number;
};

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
  registerOpenAccess: (input: {
    fullName: string;
    phone: string;
    companionsCount: number;
    companionNames: string[];
  }) =>
    apiFetch<OpenGuestAccessRegistrationDto>("/auth/guest/register-open-access", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

export const guestApi = {
  getHome: () => apiFetch<GuestHomeDto>("/guest/home"),
  listEvents: ({ eventType, page = 1, pageSize = 10 }: ListEventsParams = {}) => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (eventType) {
      query.set("eventType", eventType);
    }

    return apiFetch<EventListDto>(`/events?${query.toString()}`);
  },
  submitRsvp: (input: {
    eventId: string;
    responseStatus: RsvpResponseStatus;
    companionsConfirmed: number;
    message?: string;
  }) =>
    apiFetch<SubmitRsvpResultDto>("/rsvp/respond", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listGifts: ({
    category,
    reservationStatus,
    minEstimatedValue,
    maxEstimatedValue,
    page = 1,
    pageSize = 20,
  }: ListGiftsParams = {}) => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (category) {
      query.set("category", category);
    }

    if (reservationStatus) {
      query.set("reservationStatus", reservationStatus);
    }

    if (typeof minEstimatedValue === "number") {
      query.set("minEstimatedValue", String(minEstimatedValue));
    }

    if (typeof maxEstimatedValue === "number") {
      query.set("maxEstimatedValue", String(maxEstimatedValue));
    }

    return apiFetch<GiftCatalogListDto>(`/gifts?${query.toString()}`);
  },
  reserveGift: (giftId: string, input?: { purchaseNotes?: string }) =>
    apiFetch<GiftReservationResultDto>(`/gifts/${giftId}/reserve`, {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    }),
};

type ListAdminGuestsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "inactive";
};

export const adminApi = {
  listGuests: ({ page = 1, pageSize = 20, search, status }: ListAdminGuestsParams = {}) => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (search) {
      query.set("search", search);
    }

    if (status) {
      query.set("status", status);
    }

    return apiFetch<AdminGuestListDto>(`/admin/guests?${query.toString()}`);
  },
};
