import type { AdminUserRepository, AdminUserRepositoryFilters } from "../domain/index.js";
import type { AdminUser, AdminUserRole, AdminUserStatus } from "../domain/entities/admin-user.js";
import type { AdminUser as PrismaAdminUser } from "../../../generated/prisma/client.js";
import {
  AdminUserRole as PrismaAdminUserRole,
  AdminUserStatus as PrismaAdminUserStatus,
} from "../../../generated/prisma/enums.js";

interface AdminUserWhereInput {
  role?: keyof typeof PrismaAdminUserRole;
  status?: keyof typeof PrismaAdminUserStatus;
  OR?: Array<{
    name?: { contains: string; mode: "insensitive" };
    email?: { contains: string; mode: "insensitive" };
  }>;
}

interface AdminUserModelDelegate {
  findUnique(args: { where: { id?: string; email?: string } }): Promise<PrismaAdminUser | null>;
  findMany(args: {
    where: AdminUserWhereInput;
    orderBy: { createdAt: "asc" | "desc" };
    skip: number;
    take: number;
  }): Promise<PrismaAdminUser[]>;
  upsert(args: {
    where: { id: string };
    create: AdminUserPersistenceData;
    update: AdminUserPersistenceData;
  }): Promise<PrismaAdminUser>;
}

interface AdminUserPersistenceData {
  id: string;
  name: string;
  email: string;
  authProvider: string;
  role: keyof typeof PrismaAdminUserRole;
  status: keyof typeof PrismaAdminUserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapAdminUserRoleToDomain(role: keyof typeof PrismaAdminUserRole): AdminUserRole {
  return role.toLowerCase() as AdminUserRole;
}

function mapAdminUserStatusToDomain(status: keyof typeof PrismaAdminUserStatus): AdminUserStatus {
  return status.toLowerCase() as AdminUserStatus;
}

function mapAdminUserRoleToPersistence(role: AdminUserRole): keyof typeof PrismaAdminUserRole {
  return role.toUpperCase() as keyof typeof PrismaAdminUserRole;
}

function mapAdminUserStatusToPersistence(
  status: AdminUserStatus,
): keyof typeof PrismaAdminUserStatus {
  return status.toUpperCase() as keyof typeof PrismaAdminUserStatus;
}

function mapAdminUserRecord(record: PrismaAdminUser): AdminUser {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    authProvider: record.authProvider,
    role: mapAdminUserRoleToDomain(record.role),
    status: mapAdminUserStatusToDomain(record.status),
    lastLoginAt: record.lastLoginAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapAdminUserEntity(entity: AdminUser): AdminUserPersistenceData {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.email,
    authProvider: entity.authProvider,
    role: mapAdminUserRoleToPersistence(entity.role),
    status: mapAdminUserStatusToPersistence(entity.status),
    lastLoginAt: entity.lastLoginAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapAdminUserFilters(
  filter: AdminUserRepositoryFilters,
): { where: AdminUserWhereInput; skip: number; take: number } {
  const search = filter.search?.trim();

  return {
    where: {
      role: filter.role ? mapAdminUserRoleToPersistence(filter.role) : undefined,
      status: filter.status ? mapAdminUserStatusToPersistence(filter.status) : undefined,
      OR:
        search && search.length > 0
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
    },
    skip: Math.max(0, (filter.page - 1) * filter.pageSize),
    take: filter.pageSize,
  };
}

export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly adminUsers: AdminUserModelDelegate) {}

  async findById(id: string): Promise<AdminUser | null> {
    const record = await this.adminUsers.findUnique({
      where: { id },
    });

    return record ? mapAdminUserRecord(record) : null;
  }

  async save(entity: AdminUser): Promise<AdminUser> {
    const record = await this.adminUsers.upsert({
      where: { id: entity.id },
      create: mapAdminUserEntity(entity),
      update: mapAdminUserEntity(entity),
    });

    return mapAdminUserRecord(record);
  }

  async findMany(filter: AdminUserRepositoryFilters): Promise<readonly AdminUser[]> {
    const { where, skip, take } = mapAdminUserFilters(filter);
    const records = await this.adminUsers.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    return records.map(mapAdminUserRecord);
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    const record = await this.adminUsers.findUnique({
      where: { email },
    });

    return record ? mapAdminUserRecord(record) : null;
  }
}
