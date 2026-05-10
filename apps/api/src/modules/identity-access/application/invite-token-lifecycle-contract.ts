export interface IdentityAccessInviteTokenLifecycleContracts {
  readonly usagePolicy: "token-single-use_code-reusable";
  readonly expirationModel: "derived-from-expiresAt";
  readonly revocationModel: "persisted-status-and-timestamp";
  readonly persistenceTransitions: readonly ["mark-as-used", "revoke"];
}

export const IDENTITY_ACCESS_INVITE_TOKEN_LIFECYCLE_CONTRACTS: IdentityAccessInviteTokenLifecycleContracts =
  {
    usagePolicy: "token-single-use_code-reusable",
    expirationModel: "derived-from-expiresAt",
    revocationModel: "persisted-status-and-timestamp",
    persistenceTransitions: ["mark-as-used", "revoke"],
  };
