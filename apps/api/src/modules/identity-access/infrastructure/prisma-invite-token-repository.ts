import type { InviteTokenRepository, InviteTokenRepositoryFilters } from "../domain/index.js";
import type {
  InviteToken,
  InviteTokenChannel,
  InviteTokenStatus,
} from "../domain/entities/invite-token.js";
import type {
  MarkInviteTokenAsUsedInput,
  RevokeInviteTokenRepositoryInput,
} from "../domain/invite-token-lifecycle.js";
import type { InviteToken as PrismaInviteToken } from "../../../generated/prisma/client.js";
import {
  InviteTokenChannel as PrismaInviteTokenChannel,
  InviteTokenStatus as PrismaInviteTokenStatus,
} from "../../../generated/prisma/enums.js";

interface InviteTokenWhereInput {
  guestId?: string;
  guestGroupId?: string;
  status?: keyof typeof PrismaInviteTokenStatus;
}

interface InviteTokenModelDelegate {
  findUnique(args: {
    where: { id?: string; tokenHash?: string };
  }): Promise<PrismaInviteToken | null>;
  findFirst(args: {
    where: { shortCode: string };
    orderBy: { createdAt: "asc" | "desc" };
  }): Promise<PrismaInviteToken | null>;
  findMany(args: {
    where: InviteTokenWhereInput;
    orderBy: { createdAt: "asc" | "desc" };
    skip: number;
    take: number;
  }): Promise<PrismaInviteToken[]>;
  upsert(args: {
    where: { id: string };
    create: InviteTokenPersistenceData;
    update: InviteTokenPersistenceData;
  }): Promise<PrismaInviteToken>;
  update(args: {
    where: { id: string };
    data: Partial<InviteTokenPersistenceData>;
  }): Promise<PrismaInviteToken>;
}

interface InviteTokenPersistenceData {
  id: string;
  guestGroupId: string | null;
  guestId: string | null;
  tokenHash: string;
  shortCode: string | null;
  channel: keyof typeof PrismaInviteTokenChannel;
  status: keyof typeof PrismaInviteTokenStatus;
  issuedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapChannelToDomain(channel: keyof typeof PrismaInviteTokenChannel): InviteTokenChannel {
  return channel.toLowerCase() as InviteTokenChannel;
}

function mapStatusToDomain(status: keyof typeof PrismaInviteTokenStatus): InviteTokenStatus {
  return status.toLowerCase() as InviteTokenStatus;
}

function mapChannelToPersistence(channel: InviteTokenChannel): keyof typeof PrismaInviteTokenChannel {
  return channel.toUpperCase() as keyof typeof PrismaInviteTokenChannel;
}

function mapStatusToPersistence(status: InviteTokenStatus): keyof typeof PrismaInviteTokenStatus {
  return status.toUpperCase() as keyof typeof PrismaInviteTokenStatus;
}

function mapInviteTokenRecord(record: PrismaInviteToken): InviteToken {
  return {
    id: record.id,
    guestGroupId: record.guestGroupId,
    guestId: record.guestId,
    tokenHash: record.tokenHash,
    shortCode: record.shortCode,
    channel: mapChannelToDomain(record.channel),
    status: mapStatusToDomain(record.status),
    issuedAt: record.issuedAt,
    expiresAt: record.expiresAt,
    usedAt: record.usedAt,
    revokedAt: record.revokedAt,
    revokedReason: record.revokedReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapInviteTokenEntity(entity: InviteToken): InviteTokenPersistenceData {
  return {
    id: entity.id,
    guestGroupId: entity.guestGroupId,
    guestId: entity.guestId,
    tokenHash: entity.tokenHash,
    shortCode: entity.shortCode,
    channel: mapChannelToPersistence(entity.channel),
    status: mapStatusToPersistence(entity.status),
    issuedAt: entity.issuedAt,
    expiresAt: entity.expiresAt,
    usedAt: entity.usedAt,
    revokedAt: entity.revokedAt,
    revokedReason: entity.revokedReason,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapInviteTokenFilters(
  filter: InviteTokenRepositoryFilters,
): { where: InviteTokenWhereInput; skip: number; take: number } {
  return {
    where: {
      guestId: filter.guestId,
      guestGroupId: filter.guestGroupId,
      status: filter.status ? mapStatusToPersistence(filter.status) : undefined,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaInviteTokenRepository implements InviteTokenRepository {
  constructor(private readonly inviteTokens: InviteTokenModelDelegate) {}

  async findById(id: string): Promise<InviteToken | null> {
    const record = await this.inviteTokens.findUnique({
      where: { id },
    });

    return record ? mapInviteTokenRecord(record) : null;
  }

  async save(entity: InviteToken): Promise<InviteToken> {
    const record = await this.inviteTokens.upsert({
      where: { id: entity.id },
      create: mapInviteTokenEntity(entity),
      update: mapInviteTokenEntity(entity),
    });

    return mapInviteTokenRecord(record);
  }

  async findMany(filter: InviteTokenRepositoryFilters): Promise<readonly InviteToken[]> {
    const { where, skip, take } = mapInviteTokenFilters(filter);
    const records = await this.inviteTokens.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    return records.map(mapInviteTokenRecord);
  }

  async findByTokenHash(tokenHash: string): Promise<InviteToken | null> {
    const record = await this.inviteTokens.findUnique({
      where: { tokenHash },
    });

    return record ? mapInviteTokenRecord(record) : null;
  }

  async findByShortCode(shortCode: string): Promise<InviteToken | null> {
    const record = await this.inviteTokens.findFirst({
      where: { shortCode },
      orderBy: { createdAt: "desc" },
    });

    return record ? mapInviteTokenRecord(record) : null;
  }

  async markAsUsed(input: MarkInviteTokenAsUsedInput): Promise<InviteToken> {
    const record = await this.inviteTokens.update({
      where: { id: input.inviteTokenId },
      data: {
        status: PrismaInviteTokenStatus.USED,
        usedAt: input.usedAt ?? new Date(),
      },
    });

    return mapInviteTokenRecord(record);
  }

  async revoke(input: RevokeInviteTokenRepositoryInput): Promise<InviteToken> {
    const record = await this.inviteTokens.update({
      where: { id: input.inviteTokenId },
      data: {
        status: PrismaInviteTokenStatus.REVOKED,
        revokedAt: input.revokedAt ?? new Date(),
        revokedReason: input.reason,
      },
    });

    return mapInviteTokenRecord(record);
  }
}

export { mapInviteTokenRecord };
