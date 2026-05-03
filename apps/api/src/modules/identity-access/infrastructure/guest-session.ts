import { createHmac, timingSafeEqual } from "node:crypto";
import type { GuestPrincipal } from "../../shared/platform/http/auth-context.js";

const SESSION_TOKEN_ALGORITHM = "HS256";
const SESSION_TOKEN_TYPE = "JWT";
const DEFAULT_GUEST_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_GUEST_SESSION_COOKIE_NAME = "weddingos_guest_session";

export interface SessionVerificationInput {
  readonly token: string;
  readonly requestId: string;
}

export interface GuestSessionPayload {
  readonly actorType: "guest";
  readonly guestId: string;
  readonly guestGroupId: string;
  readonly iat: number;
  readonly exp: number;
}

export interface GuestSessionIssueInput {
  readonly guestId: string;
  readonly guestGroupId: string;
  readonly issuedAt?: Date;
}

export interface GuestSessionIssueResult {
  readonly accessToken: string;
  readonly expiresAt: Date;
  readonly payload: GuestSessionPayload;
}

export interface GuestSessionCookieAttributes {
  readonly name: string;
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: "lax" | "strict" | "none";
  readonly path: "/";
  readonly maxAge: number;
  readonly expires: Date;
}

export interface GuestSessionCookieConfigInput {
  readonly nodeEnv: "development" | "test" | "production";
  readonly expiresAt: Date;
  readonly ttlSeconds?: number;
}

export interface GuestSessionIssuer {
  issueSession(input: GuestSessionIssueInput): Promise<GuestSessionIssueResult>;
}

export interface GuestSessionVerifier {
  verifySession(input: SessionVerificationInput): Promise<GuestPrincipal | null>;
}

interface SessionTokenHeader {
  readonly alg: typeof SESSION_TOKEN_ALGORITHM;
  readonly typ: typeof SESSION_TOKEN_TYPE;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signToken(input: string, secret: string): string {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

function assertTokenPartCount(parts: string[]): boolean {
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function parseTokenPayload(token: string, secret: string): GuestSessionPayload | null {
  const parts = token.split(".");

  if (!assertTokenPartCount(parts)) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signToken(signingInput, secret);

  try {
    const actualSignature = Buffer.from(encodedSignature, "utf8");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

    if (
      actualSignature.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(actualSignature, expectedSignatureBuffer)
    ) {
      return null;
    }

    const header = JSON.parse(decodeBase64Url(encodedHeader)) as SessionTokenHeader;
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as GuestSessionPayload;

    if (header.alg !== SESSION_TOKEN_ALGORITHM || header.typ !== SESSION_TOKEN_TYPE) {
      return null;
    }

    if (payload.actorType !== "guest") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export class SignedGuestSessionService implements GuestSessionIssuer, GuestSessionVerifier {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds = DEFAULT_GUEST_SESSION_TTL_SECONDS,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async issueSession(input: GuestSessionIssueInput): Promise<GuestSessionIssueResult> {
    const issuedAt = input.issuedAt ?? this.now();
    const expiresAt = new Date(issuedAt.getTime() + this.ttlSeconds * 1000);
    const payload: GuestSessionPayload = {
      actorType: "guest",
      guestId: input.guestId,
      guestGroupId: input.guestGroupId,
      iat: Math.floor(issuedAt.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    };
    const header: SessionTokenHeader = {
      alg: SESSION_TOKEN_ALGORITHM,
      typ: SESSION_TOKEN_TYPE,
    };
    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = signToken(signingInput, this.secret);

    return {
      accessToken: `${signingInput}.${signature}`,
      expiresAt,
      payload,
    };
  }

  async verifySession(input: SessionVerificationInput): Promise<GuestPrincipal | null> {
    const payload = parseTokenPayload(input.token, this.secret);

    if (payload === null) {
      return null;
    }

    const nowInSeconds = Math.floor(this.now().getTime() / 1000);

    if (payload.exp <= nowInSeconds) {
      return null;
    }

    return {
      actorType: "guest",
      guestId: payload.guestId,
      guestGroupId: payload.guestGroupId,
    };
  }
}

export function buildGuestSessionCookieAttributes(
  input: GuestSessionCookieConfigInput,
): GuestSessionCookieAttributes {
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_GUEST_SESSION_TTL_SECONDS;

  return {
    name: DEFAULT_GUEST_SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: input.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlSeconds,
    expires: input.expiresAt,
  };
}
