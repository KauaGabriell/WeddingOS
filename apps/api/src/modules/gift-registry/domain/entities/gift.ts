export const GIFT_STATUSES = ["available", "reserved", "archived"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

export interface Gift {
  id: string;
  name: string;
  category: string;
  description: string | null;
  estimatedValue: number | null;
  imageUrl: string | null;
  displayOrder: number;
  status: GiftStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
