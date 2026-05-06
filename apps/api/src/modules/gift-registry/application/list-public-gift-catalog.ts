import type {
  GiftRepository,
  GiftReservationRepository,
} from "../domain/index.js";
import type {
  GiftCatalogItem,
  ListPublicGiftCatalogInput,
  ListPublicGiftCatalogResult,
} from "./gift-catalog-contract.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export interface ListPublicGiftCatalogDependencies {
  readonly giftRepository: Pick<GiftRepository, "findMany">;
  readonly giftReservationRepository: Pick<GiftReservationRepository, "findActiveByGiftId">;
}

export interface ListPublicGiftCatalogUseCase {
  execute(input: ListPublicGiftCatalogInput): Promise<ListPublicGiftCatalogResult>;
}

function normalizePagination(input: ListPublicGiftCatalogInput): {
  page: number;
  pageSize: number;
} {
  return {
    page: input.page ?? DEFAULT_PAGE,
    pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

function buildGiftFilter(
  input: ListPublicGiftCatalogInput,
  page: number,
  pageSize: number,
) {
  return {
    category: input.category,
    status: input.status,
    isActive: true as const,
    ...(input.minEstimatedValue === undefined ? {} : { minEstimatedValue: input.minEstimatedValue }),
    ...(input.maxEstimatedValue === undefined ? {} : { maxEstimatedValue: input.maxEstimatedValue }),
    page,
    pageSize,
  };
}

function filterCatalogItems(
  items: readonly GiftCatalogItem[],
  reservationStatus: ListPublicGiftCatalogInput["reservationStatus"],
): readonly GiftCatalogItem[] {
  if (reservationStatus === "reserved") {
    return items.filter((item) => item.activeReservation !== null);
  }

  if (reservationStatus === "available") {
    return items.filter((item) => item.activeReservation === null);
  }

  return items;
}

async function composeCatalogItems(
  gifts: Awaited<ReturnType<GiftRepository["findMany"]>>,
  giftReservationRepository: Pick<GiftReservationRepository, "findActiveByGiftId">,
): Promise<readonly GiftCatalogItem[]> {
  return Promise.all(
    gifts.map(async (gift) => ({
      gift,
      activeReservation: await giftReservationRepository.findActiveByGiftId(gift.id),
    })),
  );
}

async function findFilteredCatalogPage(
  dependencies: ListPublicGiftCatalogDependencies,
  input: ListPublicGiftCatalogInput,
  page: number,
  pageSize: number,
): Promise<readonly GiftCatalogItem[]> {
  const filteredOffset = (page - 1) * pageSize;
  const collected: GiftCatalogItem[] = [];
  let skipped = 0;
  let rawPage = 1;

  while (collected.length < pageSize) {
    const gifts = await dependencies.giftRepository.findMany(buildGiftFilter(input, rawPage, pageSize));

    if (gifts.length === 0) {
      break;
    }

    const items = filterCatalogItems(
      await composeCatalogItems(gifts, dependencies.giftReservationRepository),
      input.reservationStatus,
    );

    for (const item of items) {
      if (skipped < filteredOffset) {
        skipped += 1;
        continue;
      }

      collected.push(item);

      if (collected.length === pageSize) {
        break;
      }
    }

    if (gifts.length < pageSize) {
      break;
    }

    rawPage += 1;
  }

  return collected;
}

export function createListPublicGiftCatalogUseCase(
  dependencies: ListPublicGiftCatalogDependencies,
): ListPublicGiftCatalogUseCase {
  return {
    async execute(input) {
      const { page, pageSize } = normalizePagination(input);
      const items =
        input.reservationStatus === undefined
          ? await composeCatalogItems(
              await dependencies.giftRepository.findMany(buildGiftFilter(input, page, pageSize)),
              dependencies.giftReservationRepository,
            )
          : await findFilteredCatalogPage(dependencies, input, page, pageSize);

      return {
        items,
        page,
        pageSize,
      };
    },
  };
}
