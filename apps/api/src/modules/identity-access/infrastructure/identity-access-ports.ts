export interface IdentityAccessInfrastructurePorts {
  readonly repositories: readonly ["admin-user-repository", "invite-token-repository"];
  readonly providers: readonly [
    "admin-auth-provider",
    "guest-auth-provider",
    "invite-token-signer",
  ];
}

export const IDENTITY_ACCESS_INFRASTRUCTURE_PORTS: IdentityAccessInfrastructurePorts = {
  repositories: ["admin-user-repository", "invite-token-repository"],
  providers: ["admin-auth-provider", "guest-auth-provider", "invite-token-signer"],
};
