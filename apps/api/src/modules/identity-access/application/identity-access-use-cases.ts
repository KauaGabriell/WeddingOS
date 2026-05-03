export interface IdentityAccessModuleUseCases {
  readonly guestAuthentication: "implemented";
  readonly adminAuthentication: "planned";
  readonly inviteTokenLifecycle: "defined";
}

export const IDENTITY_ACCESS_MODULE_USE_CASES: IdentityAccessModuleUseCases = {
  guestAuthentication: "implemented",
  adminAuthentication: "planned",
  inviteTokenLifecycle: "defined",
};
