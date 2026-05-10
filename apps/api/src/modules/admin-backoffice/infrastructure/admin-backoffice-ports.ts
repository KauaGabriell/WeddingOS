export interface AdminBackofficeInfrastructurePorts {
  readonly repositories: readonly ["audit-log-repository"];
  readonly providers: readonly ["admin-session-provider"];
}

export const ADMIN_BACKOFFICE_INFRASTRUCTURE_PORTS: AdminBackofficeInfrastructurePorts = {
  repositories: ["audit-log-repository"],
  providers: ["admin-session-provider"],
};
