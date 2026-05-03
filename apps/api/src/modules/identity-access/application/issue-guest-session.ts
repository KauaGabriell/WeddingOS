import type { AppEnv } from "../../../main.js";
import type { LoginGuestWithInviteTokenResult } from "./login-with-invite-token.js";
import type { LoginGuestWithShortCodeResult } from "./login-with-short-code.js";
import type {
  GuestSessionCookieAttributes,
  GuestSessionIssueResult,
  GuestSessionIssuer,
} from "../infrastructure/index.js";
import { buildGuestSessionCookieAttributes } from "../infrastructure/index.js";

export interface IssueGuestSessionInput {
  readonly authenticationResult: LoginGuestWithInviteTokenResult | LoginGuestWithShortCodeResult;
}

export interface IssueGuestSessionResult {
  readonly accessToken: string;
  readonly expiresAt: Date;
  readonly actorType: "guest";
  readonly actorId: string;
  readonly cookie: GuestSessionCookieAttributes;
}

export interface IssueGuestSessionDependencies {
  readonly guestSessionIssuer: GuestSessionIssuer;
  readonly env: Pick<AppEnv, "NODE_ENV">;
}

export interface IssueGuestSessionUseCase {
  execute(input: IssueGuestSessionInput): Promise<IssueGuestSessionResult>;
}

export function createIssueGuestSessionUseCase(
  dependencies: IssueGuestSessionDependencies,
): IssueGuestSessionUseCase {
  return {
    async execute(input) {
      const issuedSession: GuestSessionIssueResult =
        await dependencies.guestSessionIssuer.issueSession({
          guestId: input.authenticationResult.guestId,
          guestGroupId: input.authenticationResult.guestGroupId,
          issuedAt: input.authenticationResult.authenticatedAt,
        });

      return {
        accessToken: issuedSession.accessToken,
        expiresAt: issuedSession.expiresAt,
        actorType: "guest",
        actorId: input.authenticationResult.guestId,
        cookie: buildGuestSessionCookieAttributes({
          nodeEnv: dependencies.env.NODE_ENV,
          expiresAt: issuedSession.expiresAt,
        }),
      };
    },
  };
}
