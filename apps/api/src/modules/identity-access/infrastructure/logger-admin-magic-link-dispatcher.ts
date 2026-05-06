import type { FastifyBaseLogger } from "fastify";
import type { AdminMagicLinkDispatchInput, AdminMagicLinkDispatcher } from "./admin-magic-link.js";

interface LoggerAdminMagicLinkDispatcherOptions {
  readonly includeTokenInLogs?: boolean;
}

export class LoggerAdminMagicLinkDispatcher implements AdminMagicLinkDispatcher {
  constructor(
    private readonly logger: FastifyBaseLogger,
    private readonly options: LoggerAdminMagicLinkDispatcherOptions = {},
  ) {}

  async dispatchMagicLink(input: AdminMagicLinkDispatchInput): Promise<void> {
    this.logger.info(
      {
        adminUserId: input.adminUserId,
        email: input.email,
        role: input.role,
        expiresAt: input.expiresAt.toISOString(),
        requestId: input.requestId ?? null,
        token: this.options.includeTokenInLogs ? input.token : undefined,
      },
      "Admin magic link requested",
    );
  }
}
