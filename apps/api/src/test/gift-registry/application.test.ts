import assert from "node:assert/strict";
import type { Gift, GiftReservation } from "../../modules/gift-registry/index.js";
import {
  GiftRegistryApplicationError,
  GiftReservationConflictError,
  createListPublicGiftCatalogUseCase,
  createReserveGiftUseCase,
} from "../../modules/gift-registry/index.js";
import { runNamedTests } from "../test-helpers.js";

const activeGuest = {
  id: "guest-1",
  status: "active" as const,
};

const availableGift: Gift = {
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

async function testListPublicGiftCatalogAttachesActiveReservation(): Promise<void> {
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
        return [availableGift];
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
  const useCase = createListPublicGiftCatalogUseCase({
    giftRepository: {
      async findMany() {
        return [{ ...availableGift, id: "gift-2", name: "Aparelho de jantar", displayOrder: 2 }];
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
    { ...availableGift, id: "gift-1", name: "Gift 1", estimatedValue: 100 },
    { ...availableGift, id: "gift-2", name: "Gift 2", estimatedValue: 200, displayOrder: 2 },
    { ...availableGift, id: "gift-3", name: "Gift 3", estimatedValue: 300, displayOrder: 3 },
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

async function testReserveGiftCreatesActiveReservation(): Promise<void> {
  const useCase = createReserveGiftUseCase({
    guestRepository: {
      async findById(id: string) {
        assert.equal(id, "guest-1");
        return activeGuest;
      },
    },
    giftRepository: {
      async findById(id: string) {
        assert.equal(id, "gift-1");
        return availableGift;
      },
    },
    giftReservationTransactionRunner: {
      async run(operation) {
        return operation({
          async findActiveReservationByGiftId(giftId: string) {
            assert.equal(giftId, "gift-1");
            return null;
          },
          async createActiveReservation(input) {
            assert.deepEqual(input, {
              giftId: "gift-1",
              guestId: "guest-1",
              purchaseNotes: "pago no pix",
            });
            return {
              id: "reservation-1",
              giftId: input.giftId,
              guestId: input.guestId,
              reservationStatus: "active",
              purchaseNotes: input.purchaseNotes ?? null,
              reservedAt: new Date("2026-01-03T00:00:00.000Z"),
              releasedAt: null,
              releasedByAdminUserId: null,
              createdAt: new Date("2026-01-03T00:00:00.000Z"),
              updatedAt: new Date("2026-01-03T00:00:00.000Z"),
            };
          },
        });
      },
    },
  });

  const result = await useCase.execute({
    giftId: "gift-1",
    guestId: "guest-1",
    purchaseNotes: "  pago no pix  ",
  });

  assert.equal(result.id, "reservation-1");
  assert.equal(result.purchaseNotes, "pago no pix");
}

async function testReserveGiftFailsWhenGuestNotFound(): Promise<void> {
  const useCase = createReserveGiftUseCase({
    guestRepository: { async findById() { return null; } },
    giftRepository: { async findById() { throw new Error("should not load gift"); } },
    giftReservationTransactionRunner: { async run() { throw new Error("should not start transaction"); } },
  });

  await assert.rejects(() => useCase.execute({ giftId: "gift-1", guestId: "guest-1" }), (error) => {
    assert.ok(error instanceof GiftRegistryApplicationError);
    assert.equal(error.reason, "guest_not_found");
    assert.equal(error.statusCode, 404);
    return true;
  });
}

async function testReserveGiftFailsWhenGuestInactive(): Promise<void> {
  const useCase = createReserveGiftUseCase({
    guestRepository: { async findById() { return { ...activeGuest, status: "inactive" as const }; } },
    giftRepository: { async findById() { throw new Error("should not load gift"); } },
    giftReservationTransactionRunner: { async run() { throw new Error("should not start transaction"); } },
  });

  await assert.rejects(() => useCase.execute({ giftId: "gift-1", guestId: "guest-1" }), (error) => {
    assert.ok(error instanceof GiftRegistryApplicationError);
    assert.equal(error.reason, "guest_inactive");
    assert.equal(error.statusCode, 403);
    return true;
  });
}

async function testReserveGiftFailsWhenGiftNotFound(): Promise<void> {
  const useCase = createReserveGiftUseCase({
    guestRepository: { async findById() { return activeGuest; } },
    giftRepository: { async findById() { return null; } },
    giftReservationTransactionRunner: { async run() { throw new Error("should not start transaction"); } },
  });

  await assert.rejects(() => useCase.execute({ giftId: "gift-1", guestId: "guest-1" }), (error) => {
    assert.ok(error instanceof GiftRegistryApplicationError);
    assert.equal(error.reason, "gift_not_found");
    assert.equal(error.statusCode, 404);
    return true;
  });
}

async function testReserveGiftFailsWhenGiftInactive(): Promise<void> {
  let transactionStarted = false;
  const useCase = createReserveGiftUseCase({
    guestRepository: { async findById() { return activeGuest; } },
    giftRepository: { async findById() { return { ...availableGift, isActive: false }; } },
    giftReservationTransactionRunner: {
      async run() {
        transactionStarted = true;
        throw new Error("should not start transaction");
      },
    },
  });

  await assert.rejects(() => useCase.execute({ giftId: "gift-1", guestId: "guest-1" }), (error) => {
    assert.ok(error instanceof GiftRegistryApplicationError);
    assert.equal(error.reason, "gift_inactive");
    assert.equal(error.statusCode, 403);
    assert.equal(transactionStarted, false);
    return true;
  });
}

async function testReserveGiftFailsWhenGiftUnavailableBeforeTransaction(): Promise<void> {
  let transactionStarted = false;
  const useCase = createReserveGiftUseCase({
    guestRepository: { async findById() { return activeGuest; } },
    giftRepository: { async findById() { return { ...availableGift, status: "reserved" as const }; } },
    giftReservationTransactionRunner: {
      async run() {
        transactionStarted = true;
        throw new Error("should not start transaction");
      },
    },
  });

  await assert.rejects(() => useCase.execute({ giftId: "gift-1", guestId: "guest-1" }), (error) => {
    assert.ok(error instanceof GiftRegistryApplicationError);
    assert.equal(error.reason, "gift_unavailable");
    assert.equal(error.statusCode, 403);
    assert.equal(transactionStarted, false);
    return true;
  });
}

async function testReserveGiftPropagatesReservationConflict(): Promise<void> {
  const useCase = createReserveGiftUseCase({
    guestRepository: { async findById() { return activeGuest; } },
    giftRepository: { async findById() { return availableGift; } },
    giftReservationTransactionRunner: {
      async run(operation) {
        return operation({
          async findActiveReservationByGiftId() {
            return {
              id: "reservation-1",
              giftId: "gift-1",
              guestId: "guest-2",
              reservationStatus: "active",
              purchaseNotes: null,
              reservedAt: new Date("2026-01-03T00:00:00.000Z"),
              releasedAt: null,
              releasedByAdminUserId: null,
              createdAt: new Date("2026-01-03T00:00:00.000Z"),
              updatedAt: new Date("2026-01-03T00:00:00.000Z"),
            };
          },
          async createActiveReservation() {
            throw new Error("should not create reservation");
          },
        });
      },
    },
  });

  await assert.rejects(() => useCase.execute({ giftId: "gift-1", guestId: "guest-1" }), (error) => {
    assert.ok(error instanceof GiftReservationConflictError);
    assert.equal(error.giftId, "gift-1");
    assert.equal(error.statusCode, 409);
    return true;
  });
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
    {
      name: "reserve gift creates active reservation",
      run: testReserveGiftCreatesActiveReservation,
    },
    {
      name: "reserve gift fails when guest is missing",
      run: testReserveGiftFailsWhenGuestNotFound,
    },
    {
      name: "reserve gift fails when guest is inactive",
      run: testReserveGiftFailsWhenGuestInactive,
    },
    {
      name: "reserve gift fails when gift is missing",
      run: testReserveGiftFailsWhenGiftNotFound,
    },
    {
      name: "reserve gift fails when gift is inactive",
      run: testReserveGiftFailsWhenGiftInactive,
    },
    {
      name: "reserve gift fails when gift is unavailable before transaction",
      run: testReserveGiftFailsWhenGiftUnavailableBeforeTransaction,
    },
    {
      name: "reserve gift propagates reservation conflict",
      run: testReserveGiftPropagatesReservationConflict,
    },
  ]);
}
