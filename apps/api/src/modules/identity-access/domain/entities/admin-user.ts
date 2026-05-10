export const ADMIN_USER_ROLES = ["super_admin", "editor"] as const;
export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

export const ADMIN_USER_STATUSES = ["active", "disabled"] as const;
export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  authProvider: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
