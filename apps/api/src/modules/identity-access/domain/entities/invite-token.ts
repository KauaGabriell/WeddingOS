export const INVITE_TOKEN_CHANNELS = ["whatsapp", "email", "manual"] as const;
export type InviteTokenChannel = (typeof INVITE_TOKEN_CHANNELS)[number];

export const INVITE_TOKEN_STATUSES = ["issued", "used", "revoked", "expired"] as const;
export type InviteTokenStatus = (typeof INVITE_TOKEN_STATUSES)[number];

export interface InviteToken {
  id: string;
  guestGroupId: string | null;
  guestId: string | null;
  tokenHash: string;
  shortCode: string | null;
  channel: InviteTokenChannel;
  status: InviteTokenStatus;
  issuedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
