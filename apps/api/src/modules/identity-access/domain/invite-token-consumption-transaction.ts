import type { InviteToken } from "./entities/invite-token.js";

export interface ConsumeInviteTokenInput {
  readonly inviteTokenId: string;
  readonly usedAt?: Date;
}

export interface InviteTokenConsumptionTransaction {
  consumeInviteToken(input: ConsumeInviteTokenInput): Promise<InviteToken>;
}
