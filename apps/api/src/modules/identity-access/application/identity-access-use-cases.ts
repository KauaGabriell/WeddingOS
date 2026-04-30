export interface IdentityAccessModuleUseCases {
  readonly guestAuthentication: "planned";
  readonly adminAuthentication: "planned";
  readonly inviteTokenLifecycle: "defined";
}

export const IDENTITY_ACCESS_MODULE_USE_CASES: IdentityAccessModuleUseCases = {
  guestAuthentication: "planned",
  adminAuthentication: "planned",
  inviteTokenLifecycle: "defined",
};
