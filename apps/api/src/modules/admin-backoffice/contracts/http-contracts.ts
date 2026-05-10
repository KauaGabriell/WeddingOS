export interface AdminBackofficeHttpContract {
  readonly module: "admin-backoffice";
  readonly routePrefix: "/admin";
  readonly tags: readonly ["admin-backoffice"];
}

export const ADMIN_BACKOFFICE_HTTP_CONTRACT: AdminBackofficeHttpContract = {
  module: "admin-backoffice",
  routePrefix: "/admin",
  tags: ["admin-backoffice"],
};
