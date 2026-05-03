import type { InviteTokenRepository } from "../domain/index.js";
import { revokeInviteToken } from "../domain/index.js";

export type RevokeInviteTokenFailureReason = "not_found" | "invalid_reason";

export class InviteTokenRevocationError extends Error {
  readonly reason: RevokeInviteTokenFailureReason;
  readonly statusCode: 400 | 404;

  constructor(reason: RevokeInviteTokenFailureReason) {
    super(`Invite token revocation failed: ${reason}`);
    this.name = "InviteTokenRevocationError";
    this.reason = reason;
    this.statusCode = reason === "not_found" ? 404 : 400;
  }
}

export interface RevokeInviteTokenInput {
  readonly inviteTokenId: string;
  readonly reason: string;
  readonly revokedAt?: Date;
}

export interface RevokeInviteTokenDependencies {
  readonly inviteTokenRepository: Pick<InviteTokenRepository, "findById" | "revoke">;
}

export type RevokeInviteTokenResult = Awaited<ReturnType<InviteTokenRepository["revoke"]>>;

export interface RevokeInviteTokenUseCase {
  execute(input: RevokeInviteTokenInput): Promise<RevokeInviteTokenResult>;
}

export function createRevokeInviteTokenUseCase(
  dependencies: RevokeInviteTokenDependencies,
): RevokeInviteTokenUseCase {
  return {
    async execute(input) {
      const inviteToken = await dependencies.inviteTokenRepository.findById(input.inviteTokenId);

      if (inviteToken === null) {
        throw new InviteTokenRevocationError("not_found");
      }

      let revokedInviteToken;

      try {
        revokedInviteToken = revokeInviteToken(inviteToken, {
          reason: input.reason,
          revokedAt: input.revokedAt,
        });
      } catch (error) {
        if (error instanceof TypeError) {
          throw new InviteTokenRevocationError("invalid_reason");
        }

        throw error;
      }

      return dependencies.inviteTokenRepository.revoke({
        inviteTokenId: revokedInviteToken.id,
        reason: revokedInviteToken.revokedReason ?? input.reason,
        revokedAt: revokedInviteToken.revokedAt ?? input.revokedAt,
      });
    },
  };
}
