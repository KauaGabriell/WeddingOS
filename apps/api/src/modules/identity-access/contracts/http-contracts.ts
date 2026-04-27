export interface IdentityAccessHttpContract {
  readonly module: "identity-access";
  readonly routePrefix: "/identity";
  readonly tags: readonly ["identity-access"];
}

export const IDENTITY_ACCESS_HTTP_CONTRACT: IdentityAccessHttpContract = {
  module: "identity-access",
  routePrefix: "/identity",
  tags: ["identity-access"],
};
