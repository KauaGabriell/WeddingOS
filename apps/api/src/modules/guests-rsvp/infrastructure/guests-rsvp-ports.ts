export interface GuestsRsvpInfrastructurePorts {
  readonly repositories: readonly [
    "guest-group-repository",
    "guest-repository",
    "event-repository",
    "event-guest-eligibility-repository",
    "rsvp-response-repository",
  ];
  readonly providers: readonly ["invite-delivery-provider"];
}

export const GUESTS_RSVP_INFRASTRUCTURE_PORTS: GuestsRsvpInfrastructurePorts = {
  repositories: [
    "guest-group-repository",
    "guest-repository",
    "event-repository",
    "event-guest-eligibility-repository",
    "rsvp-response-repository",
  ],
  providers: ["invite-delivery-provider"],
};
