import type { AuthenticatedPrincipal } from "../../shared/platform/http/auth-context.js";

export interface SessionVerificationInput {
  readonly token: string;
  readonly requestId: string;
}

export interface GuestSessionVerifier {
  verifySession(input: SessionVerificationInput): Promise<AuthenticatedPrincipal | null>;
}

export interface AdminSessionVerifier {
  verifySession(input: SessionVerificationInput): Promise<AuthenticatedPrincipal | null>;
}
