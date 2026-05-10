import type {
  InviteTokenConsumptionTransactionContext,
  InviteTokenConsumptionTransactionRunner,
} from "./invite-token-transactions.js";
import { PrismaInviteTokenRepository } from "./prisma-invite-token-repository.js";

interface InviteTokenTransactionCapableClient {
  readonly inviteToken: ConstructorParameters<typeof PrismaInviteTokenRepository>[0];
  $transaction<T>(
    operation: (transactionClient: {
      inviteToken: ConstructorParameters<typeof PrismaInviteTokenRepository>[0];
    }) => Promise<T>,
  ): Promise<T>;
}

export class PrismaInviteTokenConsumptionTransactionRunner
  implements InviteTokenConsumptionTransactionRunner
{
  constructor(private readonly prisma: InviteTokenTransactionCapableClient) {}

  async run<T>(
    operation: (context: InviteTokenConsumptionTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transactionClient) => {
      const repository = new PrismaInviteTokenRepository(transactionClient.inviteToken);

      return operation({
        findInviteTokenById(inviteTokenId) {
          return repository.findById(inviteTokenId);
        },
        markInviteTokenAsUsed(input) {
          return repository.markAsUsed(input);
        },
      });
    });
  }
}
