export interface IdentityAccessInfrastructurePorts {
  readonly repositories: readonly [
    "admin-user-repository",
    "invite-token-repository",
    "guest-repository",
  ];
  readonly providers: readonly [
    "admin-auth-provider",
    "admin-magic-link-issuer",
    "admin-magic-link-dispatcher",
    "admin-session-issuer",
    "guest-auth-provider",
    "guest-session-issuer",
    "invite-token-signer",
    "guest-session-verifier",
    "admin-session-verifier",
    "invite-token-consumption-transaction-runner",
  ];
}

export const IDENTITY_ACCESS_INFRASTRUCTURE_PORTS: IdentityAccessInfrastructurePorts = {
  repositories: ["admin-user-repository", "invite-token-repository", "guest-repository"],
  providers: [
    "admin-auth-provider",
    "admin-magic-link-issuer",
    "admin-magic-link-dispatcher",
    "admin-session-issuer",
    "guest-auth-provider",
    "guest-session-issuer",
    "invite-token-signer",
    "guest-session-verifier",
    "admin-session-verifier",
    "invite-token-consumption-transaction-runner",
  ],
};
