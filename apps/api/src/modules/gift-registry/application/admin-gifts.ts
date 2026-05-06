import { randomUUID } from "node:crypto";
import type { Gift, GiftStatus } from "../domain/entities/gift.js";
import type { GiftRepository } from "../domain/repositories/gift-repository.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export type AdminGiftManagementFailureReason =
  | "gift_not_found"
  | "invalid_value_range"
  | "archived_gift_must_be_inactive";

export class AdminGiftManagementError extends Error {
  readonly reason: AdminGiftManagementFailureReason;
  readonly statusCode: 400 | 404;

  constructor(reason: AdminGiftManagementFailureReason) {
    super(`Admin gift management failed: ${reason}`);
    this.name = "AdminGiftManagementError";
    this.reason = reason;
    this.statusCode = reason === "gift_not_found" ? 404 : 400;
  }
}

export interface ListAdminGiftsInput {
  readonly category?: string;
  readonly status?: GiftStatus;
  readonly isActive?: boolean;
  readonly minEstimatedValue?: number;
  readonly maxEstimatedValue?: number;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface ListAdminGiftsResult {
  readonly items: readonly Gift[];
  readonly page: number;
  readonly pageSize: number;
}

export interface UpsertAdminGiftInput {
  readonly name: string;
  readonly category: string;
  readonly description?: string;
  readonly estimatedValue?: number;
  readonly imageUrl?: string;
  readonly displayOrder: number;
  readonly status: GiftStatus;
  readonly isActive: boolean;
}

export interface CreateGiftInput extends UpsertAdminGiftInput {}

export interface UpdateGiftInput extends UpsertAdminGiftInput {
  readonly giftId: string;
}

export interface ListAdminGiftsUseCase {
  execute(input: ListAdminGiftsInput): Promise<ListAdminGiftsResult>;
}

export interface CreateGiftUseCase {
  execute(input: CreateGiftInput): Promise<Gift>;
}

export interface UpdateGiftUseCase {
  execute(input: UpdateGiftInput): Promise<Gift>;
}

export interface AdminGiftManagementDependencies {
  readonly giftRepository: Pick<GiftRepository, "findById" | "findMany" | "save">;
}

function normalizePagination(input: ListAdminGiftsInput): {
  page: number;
  pageSize: number;
} {
  return {
    page: input.page ?? DEFAULT_PAGE,
    pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

function assertValueRange(input: ListAdminGiftsInput): void {
  if (
    input.minEstimatedValue !== undefined &&
    input.maxEstimatedValue !== undefined &&
    input.minEstimatedValue > input.maxEstimatedValue
  ) {
    throw new AdminGiftManagementError("invalid_value_range");
  }
}

function normalizeOptionalText(value?: string): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeOptionalUrl(value?: string): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeArchivedState(input: UpsertAdminGiftInput): Pick<Gift, "status" | "isActive"> {
  if (input.status === "archived") {
    if (input.isActive) {
      throw new AdminGiftManagementError("archived_gift_must_be_inactive");
    }

    return {
      status: "archived",
      isActive: false,
    };
  }

  return {
    status: input.status,
    isActive: input.isActive,
  };
}

function mapGiftData(input: UpsertAdminGiftInput): Omit<Gift, "id" | "createdAt" | "updatedAt"> {
  const archivedState = normalizeArchivedState(input);

  return {
    name: input.name.trim(),
    category: input.category.trim(),
    description: normalizeOptionalText(input.description),
    estimatedValue: input.estimatedValue ?? null,
    imageUrl: normalizeOptionalUrl(input.imageUrl),
    displayOrder: input.displayOrder,
    status: archivedState.status,
    isActive: archivedState.isActive,
  };
}

export function createListAdminGiftsUseCase(
  dependencies: AdminGiftManagementDependencies,
): ListAdminGiftsUseCase {
  return {
    async execute(input) {
      assertValueRange(input);
      const { page, pageSize } = normalizePagination(input);
      const items = await dependencies.giftRepository.findMany({
        category: input.category,
        status: input.status,
        isActive: input.isActive,
        minEstimatedValue: input.minEstimatedValue,
        maxEstimatedValue: input.maxEstimatedValue,
        page,
        pageSize,
      });

      return {
        items,
        page,
        pageSize,
      };
    },
  };
}

export function createCreateGiftUseCase(
  dependencies: AdminGiftManagementDependencies,
): CreateGiftUseCase {
  return {
    async execute(input) {
      const now = new Date();

      return dependencies.giftRepository.save({
        id: randomUUID(),
        ...mapGiftData(input),
        createdAt: now,
        updatedAt: now,
      });
    },
  };
}

export function createUpdateGiftUseCase(
  dependencies: AdminGiftManagementDependencies,
): UpdateGiftUseCase {
  return {
    async execute(input) {
      const existingGift = await dependencies.giftRepository.findById(input.giftId);

      if (existingGift === null) {
        throw new AdminGiftManagementError("gift_not_found");
      }

      return dependencies.giftRepository.save({
        id: existingGift.id,
        ...mapGiftData(input),
        createdAt: existingGift.createdAt,
        updatedAt: new Date(),
      });
    },
  };
}
