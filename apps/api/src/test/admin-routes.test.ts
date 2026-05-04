import assert from "node:assert/strict";
import { buildApp } from "../main.js";
import { SignedAdminSessionService, SignedGuestSessionService } from "../modules/identity-access/index.js";
import { createTestEnv, runNamedTests } from "./test-helpers.js";

async function testAdminRoutesRequireAdminAuth(): Promise<void> {
  const env = createTestEnv();
  const app = await buildApp(env);
  const guestSessionService = new SignedGuestSessionService(env.JWT_SECRET, 300, () => new Date());
  const adminSessionService = new SignedAdminSessionService(env.JWT_SECRET, 300, () => new Date());

  try {
    const missingCredentials = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
    });
    assert.equal(missingCredentials.statusCode, 401);

    const guestSession = await guestSessionService.issueSession({
      guestId: "guest-1",
      guestGroupId: "group-1",
    });
    const guestResponse = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
      headers: {
        authorization: `Bearer ${guestSession.accessToken}`,
      },
    });
    assert.equal(guestResponse.statusCode, 403);

    const adminSession = await adminSessionService.issueSession({
      adminUserId: "admin-1",
      role: "super_admin",
    });
    const adminResponse = await app.inject({
      method: "GET",
      url: "/admin/dashboard",
      headers: {
        authorization: `Bearer ${adminSession.accessToken}`,
      },
    });
    assert.equal(adminResponse.statusCode, 501);
  } finally {
    await app.close();
  }
}

export async function runAdminRouteTests(): Promise<void> {
  await runNamedTests("admin-routes", [
    { name: "requires admin auth on dashboard route", run: testAdminRoutesRequireAdminAuth },
  ]);
}
