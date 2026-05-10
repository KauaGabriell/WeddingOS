import type { InviteToken } from "../domain/entities/invite-token.js";
import type { MarkInviteTokenAsUsedInput } from "../domain/invite-token-lifecycle.js";

export interface InviteTokenConsumptionTransactionContext {
  findInviteTokenById(inviteTokenId: string): Promise<InviteToken | null>;
  markInviteTokenAsUsed(input: MarkInviteTokenAsUsedInput): Promise<InviteToken>;
}

export interface InviteTokenConsumptionTransactionRunner {
  run<T>(
    operation: (context: InviteTokenConsumptionTransactionContext) => Promise<T>,
  ): Promise<T>;
}
