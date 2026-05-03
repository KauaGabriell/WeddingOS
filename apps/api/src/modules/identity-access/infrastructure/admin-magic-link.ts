import { createHmac } from "node:crypto";
import type { AdminUserRole } from "../domain/index.js";
import type { SessionVerificationInput } from "./guest-session.js";
import type { AuthenticatedPrincipal } from "../../shared/platform/http/auth-context.js";

const ADMIN_MAGIC_LINK_TOKEN_ALGORITHM = "HS256";
const ADMIN_MAGIC_LINK_TOKEN_TYPE = "JWT";
const ADMIN_MAGIC_LINK_TOKEN_PURPOSE = "admin_magic_link";
const DEFAULT_ADMIN_MAGIC_LINK_TTL_SECONDS = 60 * 15;

interface SessionTokenHeader {
  readonly alg: typeof ADMIN_MAGIC_LINK_TOKEN_ALGORITHM;
  readonly typ: typeof ADMIN_MAGIC_LINK_TOKEN_TYPE;
}

export interface AdminMagicLinkPayload {
  readonly actorType: "admin";
  readonly adminUserId: string;
  readonly email: string;
  readonly role: AdminUserRole;
  readonly purpose: typeof ADMIN_MAGIC_LINK_TOKEN_PURPOSE;
  readonly iat: number;
  readonly exp: number;
}

export interface AdminMagicLinkIssueInput {
  readonly adminUserId: string;
  readonly email: string;
  readonly role: AdminUserRole;
  readonly issuedAt?: Date;
}

export interface AdminMagicLinkIssueResult {
  readonly token: string;
  readonly expiresAt: Date;
  readonly payload: AdminMagicLinkPayload;
}

export interface AdminMagicLinkDispatchInput {
  readonly adminUserId: string;
  readonly email: string;
  readonly name: string;
  readonly role: AdminUserRole;
  readonly token: string;
  readonly expiresAt: Date;
  readonly requestId?: string;
}

export interface AdminMagicLinkIssuer {
  issueMagicLink(input: AdminMagicLinkIssueInput): Promise<AdminMagicLinkIssueResult>;
}

export interface AdminMagicLinkDispatcher {
  dispatchMagicLink(input: AdminMagicLinkDispatchInput): Promise<void>;
}

export interface AdminSessionIssueInput {
  readonly adminUserId: string;
  readonly role: AdminUserRole;
  readonly issuedAt?: Date;
}

export interface AdminSessionIssueResult {
  readonly accessToken: string;
  readonly expiresAt: Date;
}

export interface AdminSessionIssuer {
  issueSession(input: AdminSessionIssueInput): Promise<AdminSessionIssueResult>;
}

export interface AdminSessionVerifier {
  verifySession(input: SessionVerificationInput): Promise<AuthenticatedPrincipal | null>;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signToken(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export class SignedAdminMagicLinkService implements AdminMagicLinkIssuer {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds = DEFAULT_ADMIN_MAGIC_LINK_TTL_SECONDS,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async issueMagicLink(input: AdminMagicLinkIssueInput): Promise<AdminMagicLinkIssueResult> {
    const issuedAt = input.issuedAt ?? this.now();
    const expiresAt = new Date(issuedAt.getTime() + this.ttlSeconds * 1000);
    const payload: AdminMagicLinkPayload = {
      actorType: "admin",
      adminUserId: input.adminUserId,
      email: input.email,
      role: input.role,
      purpose: ADMIN_MAGIC_LINK_TOKEN_PURPOSE,
      iat: Math.floor(issuedAt.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
    const header: SessionTokenHeader = {
      alg: ADMIN_MAGIC_LINK_TOKEN_ALGORITHM,
      typ: ADMIN_MAGIC_LINK_TOKEN_TYPE,
    };
    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = signToken(signingInput, this.secret);

    return {
      token: `${signingInput}.${signature}`,
      expiresAt,
      payload,
    };
  }
}
