export interface GuestsRsvpIdempotencyContracts {
  readonly idempotencyKey: "eventId+guestId";
  readonly persistenceStrategy: "single-row-upsert";
  readonly replayBehavior: "return-existing-response-without-duplicate-row";
}

export const GUESTS_RSVP_IDEMPOTENCY_CONTRACTS: GuestsRsvpIdempotencyContracts = {
  idempotencyKey: "eventId+guestId",
  persistenceStrategy: "single-row-upsert",
  replayBehavior: "return-existing-response-without-duplicate-row",
};
