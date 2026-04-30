export interface GiftRegistryTransactionalContracts {
  readonly reserveAvailableGift: "transactional";
  readonly activeReservationUniqueness: "database-partial-unique-index";
  readonly conflictStatusCode: 409;
}

export const GIFT_REGISTRY_TRANSACTIONAL_CONTRACTS: GiftRegistryTransactionalContracts = {
  reserveAvailableGift: "transactional",
  activeReservationUniqueness: "database-partial-unique-index",
  conflictStatusCode: 409,
};
