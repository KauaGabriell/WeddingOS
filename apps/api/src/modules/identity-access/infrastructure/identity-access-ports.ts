export interface IdentityAccessInfrastructurePorts {
  readonly repositories: readonly ["admin-user-repository", "invite-token-repository"];
  readonly providers: readonly [
    "admin-auth-provider",
    "guest-auth-provider",
    "invite-token-signer",
    "guest-session-verifier",
    "admin-session-verifier",
    "invite-token-consumption-transaction-runner",
  ];
}

export const IDENTITY_ACCESS_INFRASTRUCTURE_PORTS: IdentityAccessInfrastructurePorts = {
  repositories: ["admin-user-repository", "invite-token-repository"],
  providers: [
    "admin-auth-provider",
    "guest-auth-provider",
    "invite-token-signer",
    "guest-session-verifier",
    "admin-session-verifier",
    "invite-token-consumption-transaction-runner",
  ],
};
