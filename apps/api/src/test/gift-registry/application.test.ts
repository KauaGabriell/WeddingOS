import assert from "node:assert/strict";
import type { Gift, GiftReservation } from "../../modules/gift-registry/index.js";
import { createListPublicGiftCatalogUseCase } from "../../modules/gift-registry/index.js";
import { runNamedTests } from "../test-helpers.js";

async function testListPublicGiftCatalogAttachesActiveReservation(): Promise<void> {
  const gift: Gift = {
    id: "gift-1",
    name: "Jogo de pratos",
    category: "casa",
    description: null,
    estimatedValue: 349.9,
    imageUrl: null,
    displayOrder: 1,
    status: "available",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
  const reservation: GiftReservation = {
    id: "reservation-1",
    giftId: "gift-1",
    guestId: "guest-1",
    reservationStatus: "active",
    purchaseNotes: null,
    reservedAt: new Date("2026-01-03T00:00:00.000Z"),
    releasedAt: null,
    releasedByAdminUserId: null,
    createdAt: new Date("2026-01-03T00:00:00.000Z"),
    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
  };

  const useCase = createListPublicGiftCatalogUseCase({
    giftRepository: {
      async findMany(filter) {
        assert.deepEqual(filter, {
          category: "casa",
          status: "available",
          isActive: true,
          page: 1,
          pageSize: 20,
        });
        return [gift];
      },
    },
    giftReservationRepository: {
      async findActiveByGiftId(giftId: string) {
        assert.equal(giftId, "gift-1");
        return reservation;
      },
    },
  });

  const result = await useCase.execute({
    category: "casa",
    status: "available",
    reservationStatus: "reserved",
  });

  assert.equal(result.items[0]?.gift.id, "gift-1");
  assert.equal(result.items[0]?.activeReservation?.id, "reservation-1");
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 20);
}

async function testListPublicGiftCatalogFiltersAvailableOnly(): Promise<void> {
  const gift: Gift = {
    id: "gift-2",
    name: "Aparelho de jantar",
    category: "casa",
    description: null,
    estimatedValue: 199.9,
    imageUrl: null,
    displayOrder: 2,
    status: "available",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  const useCase = createListPublicGiftCatalogUseCase({
    giftRepository: {
      async findMany() {
        return [gift];
      },
    },
    giftReservationRepository: {
      async findActiveByGiftId() {
        return null;
      },
    },
  });

  const result = await useCase.execute({
    reservationStatus: "available",
    page: 3,
    pageSize: 5,
  });

  assert.equal(result.items.length, 0);
  assert.equal(result.page, 3);
  assert.equal(result.pageSize, 5);
}

async function testListPublicGiftCatalogPaginatesAfterReservationFiltering(): Promise<void> {
  const gifts: Gift[] = [
    {
      id: "gift-1",
      name: "Gift 1",
      category: "casa",
      description: null,
      estimatedValue: 100,
      imageUrl: null,
      displayOrder: 1,
      status: "available",
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "gift-2",
      name: "Gift 2",
      category: "casa",
      description: null,
      estimatedValue: 200,
      imageUrl: null,
      displayOrder: 2,
      status: "available",
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "gift-3",
      name: "Gift 3",
      category: "casa",
      description: null,
      estimatedValue: 300,
      imageUrl: null,
      displayOrder: 3,
      status: "available",
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ];
  const rawPageCalls: Array<{ page: number; pageSize: number }> = [];
  const useCase = createListPublicGiftCatalogUseCase({
    giftRepository: {
      async findMany(filter) {
        rawPageCalls.push({ page: filter.page, pageSize: filter.pageSize });
        if (filter.page === 1) {
          return [gifts[0]];
        }
        if (filter.page === 2) {
          return [gifts[1]];
        }
        if (filter.page === 3) {
          return [gifts[2]];
        }
        return [];
      },
    },
    giftReservationRepository: {
      async findActiveByGiftId(giftId: string) {
        if (giftId === "gift-2" || giftId === "gift-3") {
          return {
            id: `reservation-${giftId}`,
            giftId,
            guestId: "guest-1",
            reservationStatus: "active",
            purchaseNotes: null,
            reservedAt: new Date("2026-01-03T00:00:00.000Z"),
            releasedAt: null,
            releasedByAdminUserId: null,
            createdAt: new Date("2026-01-03T00:00:00.000Z"),
            updatedAt: new Date("2026-01-03T00:00:00.000Z"),
          };
        }
        return null;
      },
    },
  });

  const result = await useCase.execute({
    reservationStatus: "reserved",
    page: 2,
    pageSize: 1,
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.gift.id, "gift-3");
  assert.deepEqual(rawPageCalls, [
    { page: 1, pageSize: 1 },
    { page: 2, pageSize: 1 },
    { page: 3, pageSize: 1 },
  ]);
}

export async function runGiftRegistryApplicationTests(): Promise<void> {
  await runNamedTests("gift-registry/application", [
    {
      name: "list public gift catalog attaches active reservation",
      run: testListPublicGiftCatalogAttachesActiveReservation,
    },
    {
      name: "list public gift catalog filters available gifts",
      run: testListPublicGiftCatalogFiltersAvailableOnly,
    },
    {
      name: "list public gift catalog paginates after reservation filtering",
      run: testListPublicGiftCatalogPaginatesAfterReservationFiltering,
    },
  ]);
}
