import type { AdminPrincipal, GuestPrincipal } from "./auth-context.js";

export interface GuestOwnedResource {
  readonly guestId?: string | null;
  readonly guestGroupId?: string | null;
}

export function canAccessGuestResource(
  principal: GuestPrincipal,
  resource: GuestOwnedResource,
): boolean {
  return resource.guestId === principal.guestId || resource.guestGroupId === principal.guestGroupId;
}

export function hasAdminRole<TAllowedRole extends string>(
  principal: AdminPrincipal,
  allowedRoles: readonly TAllowedRole[],
): boolean {
  return allowedRoles.includes(principal.role as TAllowedRole);
}
