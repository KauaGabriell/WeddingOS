export const GUEST_STATUSES = ["active", "inactive"] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

export interface Guest {
  id: string;
  guestGroupId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  status: GuestStatus;
  lastAccessAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
