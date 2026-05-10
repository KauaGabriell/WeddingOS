export interface IdentityAccessHttpContract {
  readonly module: "identity-access";
  readonly routePrefix: "/auth";
  readonly tags: readonly ["identity-access"];
}

export const IDENTITY_ACCESS_HTTP_CONTRACT: IdentityAccessHttpContract = {
  module: "identity-access",
  routePrefix: "/auth",
  tags: ["identity-access"],
};
