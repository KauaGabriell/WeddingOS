const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
export const GUEST_ACCESS_CODE_STORAGE_KEY = "weddingos_guest_access_code";
export const ADMIN_SESSION_TOKEN_STORAGE_KEY = "weddingos_admin_session_token";

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
  const adminToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem(ADMIN_SESSION_TOKEN_STORAGE_KEY)
      : null;
  const shouldAttachAdminBearer = path.startsWith("/admin") && adminToken;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(shouldAttachAdminBearer ? { Authorization: `Bearer ${adminToken}` } : {}),
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

export interface PhotoGalleryItemDto {
  id: string;
  authorName: string;
  message: string;
  mediaUrl: string;
  mediaMimeType: string;
  mediaWidth: number | null;
  mediaHeight: number | null;
  submittedAt: string;
}

export interface PhotoGalleryListDto {
  items: PhotoGalleryItemDto[];
  page: number;
  pageSize: number;
}

export interface PhotoPostDto {
  id: string;
  guestId: string;
  authorName: string;
  message: string;
  mediaStorageKey: string;
  mediaUrl: string | null;
  mediaMimeType: string;
  mediaSizeBytes: number;
  mediaWidth: number | null;
  mediaHeight: number | null;
  moderationStatus: "pending" | "approved" | "hidden" | "removed";
  submittedAt: string;
  approvedAt: string | null;
  hiddenAt: string | null;
  moderatedByAdminUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhotoPostResultDto {
  photoPost: PhotoPostDto;
  mediaUrl: string;
}

export interface AuthSessionDto {
  actorType: "guest" | "admin";
  actorId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

export interface RequestAcceptedDto {
  accepted: boolean;
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

type ListPhotoWallParams = {
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
  requestAdminLogin: (email: string) =>
    apiFetch<RequestAcceptedDto>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyAdminLoginCode: (input: { email: string; code: string }) =>
    apiFetch<AuthSessionDto>("/auth/admin/login/verify", {
      method: "POST",
      body: JSON.stringify(input),
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
  listPhotoWall: ({ page = 1, pageSize = 20 }: ListPhotoWallParams = {}) => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    return apiFetch<PhotoGalleryListDto>(`/photo-wall?${query.toString()}`);
  },
  createPhotoPost: (input: {
    authorName: string;
    message: string;
    fileName: string;
    fileBodyBase64: string;
    mediaMimeType: string;
    mediaSizeBytes: number;
    mediaWidth?: number;
    mediaHeight?: number;
  }) =>
    apiFetch<CreatePhotoPostResultDto>("/photo-wall/posts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

type ListAdminGuestsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "inactive";
};

type ListAdminRsvpsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  eventId?: string;
  responseStatus?: RsvpResponseStatus;
};

type ListAdminGiftsParams = {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: "available" | "reserved" | "archived";
  minEstimatedValue?: number;
  maxEstimatedValue?: number;
};

export interface AdminGiftListDto {
  items: GiftDto[];
  page: number;
  pageSize: number;
}

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
  updateGuest: (
    guestId: string,
    input: {
      fullName?: string;
      phone?: string | null;
      status?: "active" | "inactive";
      allowedCompanions?: number;
    },
  ) =>
    apiFetch<GuestDto>(`/admin/guests/${guestId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  listRsvps: ({
    page = 1,
    pageSize = 20,
    search,
    eventId,
    responseStatus,
  }: ListAdminRsvpsParams = {}) => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (search) {
      query.set("search", search);
    }

    if (eventId) {
      query.set("eventId", eventId);
    }

    if (responseStatus) {
      query.set("responseStatus", responseStatus);
    }

    return apiFetch<AdminGuestListDto>(`/admin/rsvps?${query.toString()}`);
  },
  listGifts: ({
    page = 1,
    pageSize = 20,
    category,
    status,
    minEstimatedValue,
    maxEstimatedValue,
  }: ListAdminGiftsParams = {}) => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (category) {
      query.set("category", category);
    }

    if (status) {
      query.set("status", status);
    }

    if (typeof minEstimatedValue === "number") {
      query.set("minEstimatedValue", String(minEstimatedValue));
    }

    if (typeof maxEstimatedValue === "number") {
      query.set("maxEstimatedValue", String(maxEstimatedValue));
    }

    return apiFetch<AdminGiftListDto>(`/admin/gifts?${query.toString()}`);
  },
  createGift: (input: {
    name: string;
    category: string;
    description?: string;
    estimatedValue?: number;
    imageUrl?: string;
    displayOrder: number;
    status: "available" | "reserved" | "archived";
    isActive: boolean;
  }) =>
    apiFetch<GiftDto>("/admin/gifts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateGift: (
    giftId: string,
    input: {
      name: string;
      category: string;
      description?: string;
      estimatedValue?: number;
      imageUrl?: string;
      displayOrder: number;
      status: "available" | "reserved" | "archived";
      isActive: boolean;
    },
  ) =>
    apiFetch<GiftDto>(`/admin/gifts/${giftId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};
