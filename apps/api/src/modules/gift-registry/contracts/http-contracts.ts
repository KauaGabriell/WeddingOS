export interface GiftRegistryHttpContract {
  readonly module: "gift-registry";
  readonly routePrefix: "/gifts";
  readonly tags: readonly ["gift-registry"];
}

export const GIFT_REGISTRY_HTTP_CONTRACT: GiftRegistryHttpContract = {
  module: "gift-registry",
  routePrefix: "/gifts",
  tags: ["gift-registry"],
};
