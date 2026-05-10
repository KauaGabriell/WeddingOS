export interface GiftRegistryInfrastructurePorts {
  readonly repositories: readonly ["gift-repository", "gift-reservation-repository"];
  readonly providers: readonly [
    "payment-proof-storage-provider",
    "gift-reservation-transaction-runner",
  ];
}

export const GIFT_REGISTRY_INFRASTRUCTURE_PORTS: GiftRegistryInfrastructurePorts = {
  repositories: ["gift-repository", "gift-reservation-repository"],
  providers: ["payment-proof-storage-provider", "gift-reservation-transaction-runner"],
};
