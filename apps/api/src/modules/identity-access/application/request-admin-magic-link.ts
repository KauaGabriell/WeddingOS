import type { AdminUserRepository } from "../domain/index.js";
import type {
  AdminMagicLinkDispatcher,
  AdminMagicLinkIssueResult,
  AdminMagicLinkIssuer,
} from "../infrastructure/index.js";

export interface RequestAdminMagicLinkInput {
  readonly email: string;
  readonly requestId?: string;
}

export interface RequestAdminMagicLinkResult {
  readonly accepted: true;
}

export interface RequestAdminMagicLinkDependencies {
  readonly adminUserRepository: Pick<AdminUserRepository, "findByEmail">;
  readonly adminMagicLinkIssuer: AdminMagicLinkIssuer;
  readonly adminMagicLinkDispatcher: AdminMagicLinkDispatcher;
}

export interface RequestAdminMagicLinkUseCase {
  execute(input: RequestAdminMagicLinkInput): Promise<RequestAdminMagicLinkResult>;
}

export function createRequestAdminMagicLinkUseCase(
  dependencies: RequestAdminMagicLinkDependencies,
): RequestAdminMagicLinkUseCase {
  return {
    async execute(input) {
      const adminUser = await dependencies.adminUserRepository.findByEmail(input.email);

      if (adminUser === null || adminUser.status !== "active") {
        return { accepted: true };
      }

      const issuedMagicLink: AdminMagicLinkIssueResult =
        await dependencies.adminMagicLinkIssuer.issueMagicLink({
          adminUserId: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        });

      await dependencies.adminMagicLinkDispatcher.dispatchMagicLink({
        adminUserId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        token: issuedMagicLink.token,
        expiresAt: issuedMagicLink.expiresAt,
        requestId: input.requestId,
      });

      return { accepted: true };
    },
  };
}
