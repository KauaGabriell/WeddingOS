import { randomUUID } from "node:crypto";
import type { AuditLogWriter } from "../../admin-backoffice/application/audit-log-writer.js";
import type {
  Event,
  EventGuestEligibility,
  EventGuestEligibilityRepository,
  EventRepository,
  Guest as GuestsRsvpGuest,
  GuestGroup,
  GuestGroupRepository,
} from "../../guests-rsvp/index.js";
import type { InviteTokenRepository } from "../domain/index.js";
import type { GuestRepository } from "../domain/repositories/guest-repository.js";
import type { InviteToken } from "../domain/entities/invite-token.js";
import type { OpenGuestAccessRegistrationTransactionRunner } from "../infrastructure/open-guest-access-transactions.js";

const ACTIVE_EVENT_PAGE_SIZE = 100;
const SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHORT_CODE_LENGTH = 8;
const MAX_GROUP_CODE_ATTEMPTS = 10;
const DEFAULT_TOKEN_TTL_DAYS = 365;

export type OpenGuestAccessRegistrationErrorReason =
  | "phone_already_registered"
  | "invalid_companions_payload"
  | "invalid_phone"
  | "invalid_full_name";

export class OpenGuestAccessRegistrationError extends Error {
  readonly statusCode: 400 | 409;

  constructor(readonly reason: OpenGuestAccessRegistrationErrorReason) {
    super(reason);
    this.name = "OpenGuestAccessRegistrationError";
    this.statusCode = reason === "phone_already_registered" ? 409 : 400;
  }
}

export interface RegisterOpenGuestAccessInput {
  readonly fullName: string;
  readonly phone: string;
  readonly companionsCount: number;
  readonly companionNames: readonly string[];
  readonly requestId?: string;
}

export interface RegisterOpenGuestAccessResult {
  readonly authenticationResult: {
    readonly guestId: string;
    readonly guestGroupId: string;
    readonly inviteTokenId: string;
    readonly authenticatedAt: Date;
  };
  readonly guest: GuestsRsvpGuest;
  readonly guestGroup: GuestGroup;
  readonly companions: readonly GuestsRsvpGuest[];
  readonly shortCode: string;
  readonly message: string;
}

export interface RegisterOpenGuestAccessDependencies {
  readonly guestRepository: Pick<GuestRepository, "findPrimaryByPhone">;
  readonly guestGroupRepository: Pick<GuestGroupRepository, "findByGroupCode">;
  readonly inviteTokenRepository: Pick<InviteTokenRepository, "findByShortCode">;
  readonly eventRepository: Pick<EventRepository, "findMany">;
  readonly registrationTransactionRunner: OpenGuestAccessRegistrationTransactionRunner;
  readonly auditLogWriter: AuditLogWriter;
  readonly now?: () => Date;
}

export interface RegisterOpenGuestAccessUseCase {
  execute(input: RegisterOpenGuestAccessInput): Promise<RegisterOpenGuestAccessResult>;
}

function normalizeFullName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, " ");
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeCompanionName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function assertValidInput(input: RegisterOpenGuestAccessInput): {
  fullName: string;
  phone: string;
  companionNames: string[];
} {
  const fullName = normalizeFullName(input.fullName);
  const phone = normalizePhone(input.phone);
  const companionNames = input.companionNames.map(normalizeCompanionName);

  if (fullName.length < 3) {
    throw new OpenGuestAccessRegistrationError("invalid_full_name");
  }

  if (phone.length < 10 || phone.length > 15) {
    throw new OpenGuestAccessRegistrationError("invalid_phone");
  }

  if (
    !Number.isInteger(input.companionsCount) ||
    input.companionsCount < 0 ||
    input.companionsCount !== companionNames.length ||
    companionNames.some((name) => name.length < 3)
  ) {
    throw new OpenGuestAccessRegistrationError("invalid_companions_payload");
  }

  const uniqueCompanionNames = new Set(companionNames.map((name) => name.toLowerCase()));
  if (uniqueCompanionNames.size !== companionNames.length) {
    throw new OpenGuestAccessRegistrationError("invalid_companions_payload");
  }

  return { fullName, phone, companionNames };
}

function buildGuestGroupDisplayName(fullName: string): string {
  const parts = fullName.split(" ").filter((part) => part.length > 0);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? fullName;
  return `Familia ${surname}`;
}

function buildRandomCode(length: number): string {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * SHORT_CODE_ALPHABET.length);
    result += SHORT_CODE_ALPHABET[randomIndex];
  }
  return result;
}

async function generateUniqueShortCode(
  inviteTokenRepository: Pick<InviteTokenRepository, "findByShortCode">,
): Promise<string> {
  while (true) {
    const shortCode = buildRandomCode(SHORT_CODE_LENGTH);
    const existingToken = await inviteTokenRepository.findByShortCode(shortCode);

    if (existingToken === null) {
      return shortCode;
    }
  }
}

async function generateUniqueGroupCode(
  guestGroupRepository: Pick<GuestGroupRepository, "findByGroupCode">,
  fullName: string,
): Promise<string> {
  const parts = fullName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[^\w\s]/g, "")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const base = (parts[parts.length - 1] ?? "FAMILIA").slice(0, 6);

  for (let attempt = 0; attempt < MAX_GROUP_CODE_ATTEMPTS; attempt += 1) {
    const suffix = buildRandomCode(4);
    const groupCode = `${base}${suffix}`;
    const existingGroup = await guestGroupRepository.findByGroupCode(groupCode);

    if (existingGroup === null) {
      return groupCode;
    }
  }

  return `FAM${Date.now().toString().slice(-6)}`;
}

function createGuestGroupEntity(input: {
  id: string;
  fullName: string;
  phone: string;
  companionsCount: number;
  groupCode: string;
  now: Date;
}): GuestGroup {
  return {
    id: input.id,
    displayName: buildGuestGroupDisplayName(input.fullName),
    groupCode: input.groupCode,
    allowedCompanions: input.companionsCount,
    primaryContactName: input.fullName,
    primaryContactPhone: input.phone,
    primaryContactEmail: null,
    notes: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function createGuestEntity(input: {
  id: string;
  guestGroupId: string;
  fullName: string;
  phone: string | null;
  isPrimary: boolean;
  now: Date;
}): GuestsRsvpGuest {
  return {
    id: input.id,
    guestGroupId: input.guestGroupId,
    fullName: input.fullName,
    phone: input.phone,
    email: null,
    isPrimary: input.isPrimary,
    status: "active",
    lastAccessAt: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function createInviteTokenEntity(input: {
  id: string;
  guestId: string;
  tokenHash: string;
  shortCode: string;
  issuedAt: Date;
}): InviteToken {
  return {
    id: input.id,
    guestGroupId: null,
    guestId: input.guestId,
    tokenHash: input.tokenHash,
    shortCode: input.shortCode,
    channel: "manual",
    status: "issued",
    issuedAt: input.issuedAt,
    expiresAt: new Date(input.issuedAt.getTime() + DEFAULT_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    usedAt: null,
    revokedAt: null,
    revokedReason: null,
    createdAt: input.issuedAt,
    updatedAt: input.issuedAt,
  };
}

function createEventGuestEligibilityEntity(input: {
  eventId: string;
  guestId: string;
  now: Date;
}): EventGuestEligibility {
  return {
    id: randomUUID(),
    eventId: input.eventId,
    guestId: input.guestId,
    canRsvp: true,
    createdAt: input.now,
  };
}

export function createRegisterOpenGuestAccessUseCase(
  dependencies: RegisterOpenGuestAccessDependencies,
): RegisterOpenGuestAccessUseCase {
  return {
    async execute(input) {
      const now = dependencies.now?.() ?? new Date();
      const normalizedInput = assertValidInput(input);
      const existingPrimaryGuest = await dependencies.guestRepository.findPrimaryByPhone(
        normalizedInput.phone,
      );

      if (existingPrimaryGuest !== null) {
        throw new OpenGuestAccessRegistrationError("phone_already_registered");
      }

      const [groupCode, shortCode, activeEvents] = await Promise.all([
        generateUniqueGroupCode(dependencies.guestGroupRepository, normalizedInput.fullName),
        generateUniqueShortCode(dependencies.inviteTokenRepository),
        dependencies.eventRepository.findMany({
          page: 1,
          pageSize: ACTIVE_EVENT_PAGE_SIZE,
          isActive: true,
        }),
      ]);

      const guestGroupId = randomUUID();
      const primaryGuestId = randomUUID();
      const inviteTokenId = randomUUID();

      const guestGroup = createGuestGroupEntity({
        id: guestGroupId,
        fullName: normalizedInput.fullName,
        phone: normalizedInput.phone,
        companionsCount: input.companionsCount,
        groupCode,
        now,
      });
      const primaryGuest = createGuestEntity({
        id: primaryGuestId,
        guestGroupId,
        fullName: normalizedInput.fullName,
        phone: normalizedInput.phone,
        isPrimary: true,
        now,
      });
      const companions = normalizedInput.companionNames.map((companionName) =>
        createGuestEntity({
          id: randomUUID(),
          guestGroupId,
          fullName: companionName,
          phone: null,
          isPrimary: false,
          now,
        }),
      );
      const inviteToken = createInviteTokenEntity({
        id: inviteTokenId,
        guestId: primaryGuestId,
        tokenHash: `open-access-${randomUUID()}`,
        shortCode,
        issuedAt: now,
      });

      await dependencies.registrationTransactionRunner.run(async (context) => {
        await context.saveGuestGroup(guestGroup);
        await context.saveGuest(primaryGuest);

        for (const companion of companions) {
          await context.saveGuest(companion);
        }

        for (const event of activeEvents) {
          await context.saveEventGuestEligibility(
            createEventGuestEligibilityEntity({ eventId: event.id, guestId: primaryGuest.id, now }),
          );

          for (const companion of companions) {
            await context.saveEventGuestEligibility(
              createEventGuestEligibilityEntity({ eventId: event.id, guestId: companion.id, now }),
            );
          }
        }

        await context.saveInviteToken(inviteToken);
      });

      await dependencies.auditLogWriter.write({
        entityType: "guest",
        entityId: primaryGuest.id,
        actionType: "GUEST_OPEN_REGISTRATION_COMPLETED",
        actorType: "guest",
        actorGuestId: primaryGuest.id,
        requestId: input.requestId,
        metadata: {
          guestGroupId,
          companionsCount: companions.length,
          shortCode,
        },
      });

      await dependencies.auditLogWriter.write({
        entityType: "guest_group",
        entityId: guestGroup.id,
        actionType: "GUEST_GROUP_CREATED",
        actorType: "guest",
        actorGuestId: primaryGuest.id,
        requestId: input.requestId,
        metadata: {
          groupCode: guestGroup.groupCode,
          principalGuestId: primaryGuest.id,
          companionsCount: companions.length,
        },
      });

      return {
        authenticationResult: {
          guestId: primaryGuest.id,
          guestGroupId: guestGroup.id,
          inviteTokenId: inviteToken.id,
          authenticatedAt: now,
        },
        guest: primaryGuest,
        guestGroup,
        companions,
        shortCode,
        message:
          "Guarde este codigo. Voce vai usar esse codigo para entrar novamente em outro aparelho ou se sua sessao expirar.",
      };
    },
  };
}
