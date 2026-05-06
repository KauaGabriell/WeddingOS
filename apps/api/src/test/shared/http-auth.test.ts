import assert from "node:assert/strict";
import {
  createAdminAuthGuard,
  createGuestAuthGuard,
  type GuestSessionVerifier,
  type SessionVerificationInput,
} from "../../modules/identity-access/index.js";
import {
  allowPublicAccess,
  canAccessGuestResource,
  hasAdminRole,
  resolveBearerToken,
  type AdminPrincipal,
  type GuestPrincipal,
  type HttpStatusError,
} from "../../modules/shared/index.js";
import { createAuthRequest, runNamedTests } from "../test-helpers.js";

async function testBearerTokenResolution(): Promise<void> {
  assert.equal(resolveBearerToken(createAuthRequest("Bearer guest-token")), "guest-token");
  assert.throws(() => resolveBearerToken(createAuthRequest()), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 401;
  });
  assert.throws(() => resolveBearerToken(createAuthRequest("Token guest-token")), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 401;
  });
}

async function testAuthGuardsSeparateGuestAndAdmin(): Promise<void> {
  const guestPrincipal: GuestPrincipal = {
    actorType: "guest",
    guestId: "guest-1",
    guestGroupId: "group-1",
  };
  const adminPrincipal: AdminPrincipal = {
    actorType: "admin",
    adminUserId: "admin-1",
    role: "super_admin",
  };

  const guestVerifier = {
    async verifySession({ token }: SessionVerificationInput) {
      if (token === "guest-token") {
        return guestPrincipal;
      }

      if (token === "admin-token") {
        return adminPrincipal;
      }

      return null;
    },
  };
  const adminVerifier = {
    async verifySession({ token }: SessionVerificationInput) {
      if (token === "guest-token") {
        return guestPrincipal;
      }

      if (token === "admin-token") {
        return adminPrincipal;
      }

      return null;
    },
  };

  const guestGuard = createGuestAuthGuard(guestVerifier as GuestSessionVerifier);
  const adminGuard = createAdminAuthGuard(adminVerifier);

  const guestRequest = createAuthRequest("Bearer guest-token");
  const resolvedGuest = await guestGuard(guestRequest);

  assert.deepEqual(resolvedGuest, guestPrincipal);
  assert.deepEqual(guestRequest.auth, guestPrincipal);

  await assert.rejects(() => guestGuard(createAuthRequest("Bearer invalid-token")), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 401;
  });
  await assert.rejects(() => adminGuard(createAuthRequest("Bearer guest-token")), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 403;
  });
  await assert.rejects(() => guestGuard(createAuthRequest("Bearer admin-token")), (error: unknown) => {
    return (error as HttpStatusError).statusCode === 403;
  });

  const cookieRequest = createAuthRequest(undefined, "weddingos_guest_session=guest-token");
  const resolvedGuestByCookie = await guestGuard(cookieRequest);
  assert.deepEqual(resolvedGuestByCookie, guestPrincipal);
}

async function testAccessPolicies(): Promise<void> {
  const guestPrincipal: GuestPrincipal = {
    actorType: "guest",
    guestId: "guest-1",
    guestGroupId: "group-1",
  };
  const adminPrincipal: AdminPrincipal = {
    actorType: "admin",
    adminUserId: "admin-1",
    role: "super_admin",
  };
  const editorPrincipal: AdminPrincipal = {
    actorType: "admin",
    adminUserId: "admin-2",
    role: "editor",
  };

  assert.equal(canAccessGuestResource(guestPrincipal, { guestId: "guest-1" }), true);
  assert.equal(canAccessGuestResource(guestPrincipal, { guestGroupId: "group-1" }), true);
  assert.equal(canAccessGuestResource(guestPrincipal, { guestId: "guest-2" }), false);
  assert.equal(hasAdminRole(adminPrincipal, ["super_admin"]), true);
  assert.equal(hasAdminRole(editorPrincipal, ["super_admin"]), false);

  const publicRequest = createAuthRequest();
  await allowPublicAccess(publicRequest);
  assert.equal(publicRequest.auth, undefined);
}

export async function runSharedHttpAuthTests(): Promise<void> {
  await runNamedTests("shared/http-auth", [
    { name: "resolves bearer token", run: testBearerTokenResolution },
    { name: "separates guest and admin guards", run: testAuthGuardsSeparateGuestAndAdmin },
    { name: "applies access policies", run: testAccessPolicies },
  ]);
}
