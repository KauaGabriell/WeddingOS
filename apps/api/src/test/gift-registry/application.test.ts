import assert from "node:assert/strict";
import type { Gift, GiftReservation } from "../../modules/gift-registry/index.js";
import {
  AdminGiftManagementError,
  GiftRegistryApplicationError,
  GiftReservationManagementError,
  GiftReservationConflictError,
  createCreateGiftUseCase,
  createListPublicGiftCatalogUseCase,
  createListAdminGiftsUseCase,
  createManageGiftReservationUseCase,
  createReserveGiftUseCase,
  createUpdateGiftUseCase,
} from "../../modules/gift-registry/index.js";
import { runNamedTests } from "../test-helpers.js";

const activeGuest = {
  id: "guest-1",
  status: "active" as const,
};

const activeAdmin = {
  id: "admin-1",
};

const activeReservation: GiftReservation = {
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
        return activeReservation;
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

async function testListAdminGiftsAppliesFiltersAndPagination(): Promise<void> {
  const useCase = createListAdminGiftsUseCase({
    giftRepository: {
      async findMany(filter) {
        assert.deepEqual(filter, {
          category: "casa",
          status: "available",
          isActive: true,
          minEstimatedValue: 100,
          maxEstimatedValue: 400,
          page: 2,
          pageSize: 5,
        });
        return [availableGift];
      },
      async findById() {
        throw new Error("not used");
      },
      async save() {
        throw new Error("not used");
      },
    },
  });

  const result = await useCase.execute({
    category: "casa",
    status: "available",
    isActive: true,
    minEstimatedValue: 100,
    maxEstimatedValue: 400,
    page: 2,
    pageSize: 5,
  });

  assert.equal(result.items[0]?.id, "gift-1");
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 5);
}

async function testListAdminGiftsRejectsInvalidValueRange(): Promise<void> {
  const useCase = createListAdminGiftsUseCase({
    giftRepository: {
      async findMany() {
        throw new Error("should not query repository");
      },
      async findById() {
        throw new Error("not used");
      },
      async save() {
        throw new Error("not used");
      },
    },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        minEstimatedValue: 500,
        maxEstimatedValue: 100,
      }),
    (error) => {
      assert.ok(error instanceof AdminGiftManagementError);
      assert.equal(error.reason, "invalid_value_range");
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
}

async function testCreateGiftPersistsNewGift(): Promise<void> {
  const useCase = createCreateGiftUseCase({
    giftRepository: {
      async save(entity) {
        assert.equal(entity.name, "Jogo de panelas");
        assert.equal(entity.category, "cozinha");
        assert.equal(entity.description, "inox");
        assert.equal(entity.estimatedValue, 299.9);
        assert.equal(entity.imageUrl, "https://example.com/panelas.jpg");
        assert.equal(entity.displayOrder, 3);
        assert.equal(entity.status, "available");
        assert.equal(entity.isActive, true);
        assert.match(entity.id, /^[0-9a-f-]{36}$/);
        return entity;
      },
      async findById() {
        throw new Error("not used");
      },
      async findMany() {
        throw new Error("not used");
      },
    },
  });

  const created = await useCase.execute({
    name: "Jogo de panelas",
    category: "cozinha",
    description: "  inox  ",
    estimatedValue: 299.9,
    imageUrl: "https://example.com/panelas.jpg",
    displayOrder: 3,
    status: "available",
    isActive: true,
  });

  assert.equal(created.name, "Jogo de panelas");
  assert.equal(created.description, "inox");
}

async function testCreateGiftRejectsArchivedGiftMarkedActive(): Promise<void> {
  const useCase = createCreateGiftUseCase({
    giftRepository: {
      async save() {
        throw new Error("should not persist");
      },
      async findById() {
        throw new Error("not used");
      },
      async findMany() {
        throw new Error("not used");
      },
    },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        name: "Vaso",
        category: "decor",
        displayOrder: 1,
        status: "archived",
        isActive: true,
      }),
    (error) => {
      assert.ok(error instanceof AdminGiftManagementError);
      assert.equal(error.reason, "archived_gift_must_be_inactive");
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
}

async function testUpdateGiftPersistsChangesAndReorder(): Promise<void> {
  const useCase = createUpdateGiftUseCase({
    giftRepository: {
      async findById(id) {
        assert.equal(id, "gift-1");
        return availableGift;
      },
      async save(entity) {
        assert.equal(entity.id, "gift-1");
        assert.equal(entity.displayOrder, 7);
        assert.equal(entity.status, "archived");
        assert.equal(entity.isActive, false);
        assert.equal(entity.createdAt.toISOString(), availableGift.createdAt.toISOString());
        return entity;
      },
      async findMany() {
        throw new Error("not used");
      },
    },
  });

  const updated = await useCase.execute({
    giftId: "gift-1",
    name: "Jogo de pratos premium",
    category: "casa",
    description: "  novo  ",
    estimatedValue: 499.9,
    imageUrl: "https://example.com/pratos.jpg",
    displayOrder: 7,
    status: "archived",
    isActive: false,
  });

  assert.equal(updated.displayOrder, 7);
  assert.equal(updated.status, "archived");
  assert.equal(updated.isActive, false);
}

async function testUpdateGiftFailsWhenGiftNotFound(): Promise<void> {
  const useCase = createUpdateGiftUseCase({
    giftRepository: {
      async findById() {
        return null;
      },
      async save() {
        throw new Error("should not persist");
      },
      async findMany() {
        throw new Error("not used");
      },
    },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        giftId: "gift-missing",
        name: "Item",
        category: "casa",
        displayOrder: 1,
        status: "available",
        isActive: true,
      }),
    (error) => {
      assert.ok(error instanceof AdminGiftManagementError);
      assert.equal(error.reason, "gift_not_found");
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
}

async function testUpdateGiftRejectsArchivedGiftMarkedActive(): Promise<void> {
  const useCase = createUpdateGiftUseCase({
    giftRepository: {
      async findById() {
        return availableGift;
      },
      async save() {
        throw new Error("should not persist");
      },
      async findMany() {
        throw new Error("not used");
      },
    },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        giftId: "gift-1",
        name: "Item",
        category: "casa",
        displayOrder: 1,
        status: "archived",
        isActive: true,
      }),
    (error) => {
      assert.ok(error instanceof AdminGiftManagementError);
      assert.equal(error.reason, "archived_gift_must_be_inactive");
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
}

async function testManageGiftReservationReleasesReservation(): Promise<void> {
  const useCase = createManageGiftReservationUseCase({
    giftReservationRepository: {
      async findById(id: string) {
        assert.equal(id, "reservation-1");
        return activeReservation;
      },
    },
    adminUserRepository: {
      async findById(id: string) {
        assert.equal(id, "admin-1");
        return activeAdmin;
      },
    },
    guestRepository: {
      async findById() {
        throw new Error("should not load target guest");
      },
    },
    giftReservationTransactionRunner: {
      async run(operation) {
        return operation({
          async findReservationById(id: string) {
            assert.equal(id, "reservation-1");
            return activeReservation;
          },
          async findActiveReservationByGiftId() {
            throw new Error("not used");
          },
          async createActiveReservation() {
            throw new Error("should not create replacement");
          },
          async releaseActiveReservation(input) {
            assert.deepEqual(input, {
              reservationId: "reservation-1",
              releasedByAdminUserId: "admin-1",
            });
            return {
              ...activeReservation,
              reservationStatus: "released",
              releasedAt: new Date("2026-01-04T00:00:00.000Z"),
              releasedByAdminUserId: "admin-1",
              updatedAt: new Date("2026-01-04T00:00:00.000Z"),
            };
          },
        });
      },
    },
  });

  const result = await useCase.execute({
    reservationId: "reservation-1",
    releasedByAdminUserId: "admin-1",
    reason: "manual fix",
  });

  assert.equal(result.releasedReservation.reservationStatus, "released");
  assert.equal(result.releasedReservation.releasedByAdminUserId, "admin-1");
  assert.equal(result.newActiveReservation, null);
}

async function testManageGiftReservationReassignsReservation(): Promise<void> {
  const useCase = createManageGiftReservationUseCase({
    giftReservationRepository: {
      async findById() {
        return activeReservation;
      },
    },
    adminUserRepository: {
      async findById() {
        return activeAdmin;
      },
    },
    guestRepository: {
      async findById(id: string) {
        assert.equal(id, "guest-2");
        return { id: "guest-2", status: "active" as const };
      },
    },
    giftReservationTransactionRunner: {
      async run(operation) {
        return operation({
          async findReservationById() {
            return activeReservation;
          },
          async findActiveReservationByGiftId() {
            throw new Error("not used");
          },
          async releaseActiveReservation() {
            return {
              ...activeReservation,
              reservationStatus: "released",
              releasedAt: new Date("2026-01-04T00:00:00.000Z"),
              releasedByAdminUserId: "admin-1",
            };
          },
          async createActiveReservation(input) {
            assert.deepEqual(input, {
              giftId: "gift-1",
              guestId: "guest-2",
            });
            return {
              ...activeReservation,
              id: "reservation-2",
              guestId: "guest-2",
            };
          },
        });
      },
    },
  });

  const result = await useCase.execute({
    reservationId: "reservation-1",
    releasedByAdminUserId: "admin-1",
    reassignToGuestId: "guest-2",
  });

  assert.equal(result.releasedReservation.reservationStatus, "released");
  assert.equal(result.newActiveReservation?.id, "reservation-2");
  assert.equal(result.newActiveReservation?.guestId, "guest-2");
}

async function testManageGiftReservationFailsWhenReservationNotFound(): Promise<void> {
  const useCase = createManageGiftReservationUseCase({
    giftReservationRepository: { async findById() { return null; } },
    adminUserRepository: { async findById() { throw new Error("should not load admin"); } },
    guestRepository: { async findById() { throw new Error("should not load guest"); } },
    giftReservationTransactionRunner: { async run() { throw new Error("should not start transaction"); } },
  });

  await assert.rejects(
    () => useCase.execute({ reservationId: "reservation-1", releasedByAdminUserId: "admin-1" }),
    (error) => {
      assert.ok(error instanceof GiftReservationManagementError);
      assert.equal(error.reason, "reservation_not_found");
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
}

async function testManageGiftReservationFailsWhenReservationNotActive(): Promise<void> {
  const useCase = createManageGiftReservationUseCase({
    giftReservationRepository: {
      async findById() {
        return { ...activeReservation, reservationStatus: "released" as const };
      },
    },
    adminUserRepository: { async findById() { throw new Error("should not load admin"); } },
    guestRepository: { async findById() { throw new Error("should not load guest"); } },
    giftReservationTransactionRunner: { async run() { throw new Error("should not start transaction"); } },
  });

  await assert.rejects(
    () => useCase.execute({ reservationId: "reservation-1", releasedByAdminUserId: "admin-1" }),
    (error) => {
      assert.ok(error instanceof GiftReservationManagementError);
      assert.equal(error.reason, "reservation_not_active");
      assert.equal(error.statusCode, 409);
      return true;
    },
  );
}

async function testManageGiftReservationFailsWhenAdminMissing(): Promise<void> {
  const useCase = createManageGiftReservationUseCase({
    giftReservationRepository: { async findById() { return activeReservation; } },
    adminUserRepository: { async findById() { return null; } },
    guestRepository: { async findById() { throw new Error("should not load guest"); } },
    giftReservationTransactionRunner: { async run() { throw new Error("should not start transaction"); } },
  });

  await assert.rejects(
    () => useCase.execute({ reservationId: "reservation-1", releasedByAdminUserId: "admin-1" }),
    (error) => {
      assert.ok(error instanceof GiftReservationManagementError);
      assert.equal(error.reason, "admin_user_not_found");
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
}

async function testManageGiftReservationFailsWhenTargetGuestMissing(): Promise<void> {
  const useCase = createManageGiftReservationUseCase({
    giftReservationRepository: { async findById() { return activeReservation; } },
    adminUserRepository: { async findById() { return activeAdmin; } },
    guestRepository: { async findById() { return null; } },
    giftReservationTransactionRunner: { async run() { throw new Error("should not start transaction"); } },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        reservationId: "reservation-1",
        releasedByAdminUserId: "admin-1",
        reassignToGuestId: "guest-2",
      }),
    (error) => {
      assert.ok(error instanceof GiftReservationManagementError);
      assert.equal(error.reason, "target_guest_not_found");
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
}

async function testManageGiftReservationFailsWhenTargetGuestInactive(): Promise<void> {
  const useCase = createManageGiftReservationUseCase({
    giftReservationRepository: { async findById() { return activeReservation; } },
    adminUserRepository: { async findById() { return activeAdmin; } },
    guestRepository: { async findById() { return { id: "guest-2", status: "inactive" as const }; } },
    giftReservationTransactionRunner: { async run() { throw new Error("should not start transaction"); } },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        reservationId: "reservation-1",
        releasedByAdminUserId: "admin-1",
        reassignToGuestId: "guest-2",
      }),
    (error) => {
      assert.ok(error instanceof GiftReservationManagementError);
      assert.equal(error.reason, "target_guest_inactive");
      assert.equal(error.statusCode, 403);
      return true;
    },
  );
}

async function testManageGiftReservationFailsWhenTargetGuestSameAsCurrent(): Promise<void> {
  const useCase = createManageGiftReservationUseCase({
    giftReservationRepository: { async findById() { return activeReservation; } },
    adminUserRepository: { async findById() { return activeAdmin; } },
    guestRepository: { async findById() { throw new Error("should not load guest"); } },
    giftReservationTransactionRunner: { async run() { throw new Error("should not start transaction"); } },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        reservationId: "reservation-1",
        releasedByAdminUserId: "admin-1",
        reassignToGuestId: "guest-1",
      }),
    (error) => {
      assert.ok(error instanceof GiftReservationManagementError);
      assert.equal(error.reason, "target_guest_same_as_current");
      assert.equal(error.statusCode, 409);
      return true;
    },
  );
}

async function testManageGiftReservationPropagatesReservationConflict(): Promise<void> {
  const useCase = createManageGiftReservationUseCase({
    giftReservationRepository: { async findById() { return activeReservation; } },
    adminUserRepository: { async findById() { return activeAdmin; } },
    guestRepository: { async findById() { return { id: "guest-2", status: "active" as const }; } },
    giftReservationTransactionRunner: {
      async run(operation) {
        return operation({
          async findReservationById() {
            return activeReservation;
          },
          async findActiveReservationByGiftId() {
            throw new Error("not used");
          },
          async releaseActiveReservation() {
            return {
              ...activeReservation,
              reservationStatus: "released",
              releasedAt: new Date("2026-01-04T00:00:00.000Z"),
              releasedByAdminUserId: "admin-1",
            };
          },
          async createActiveReservation() {
            throw new GiftReservationConflictError("gift-1");
          },
        });
      },
    },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        reservationId: "reservation-1",
        releasedByAdminUserId: "admin-1",
        reassignToGuestId: "guest-2",
      }),
    (error) => {
      assert.ok(error instanceof GiftReservationConflictError);
      assert.equal(error.giftId, "gift-1");
      assert.equal(error.statusCode, 409);
      return true;
    },
  );
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
          async findReservationById() {
            throw new Error("not used");
          },
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
          async releaseActiveReservation() {
            throw new Error("not used");
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
          async findReservationById() {
            throw new Error("not used");
          },
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
          async releaseActiveReservation() {
            throw new Error("not used");
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
      name: "list admin gifts applies filters and pagination",
      run: testListAdminGiftsAppliesFiltersAndPagination,
    },
    {
      name: "list admin gifts rejects invalid value range",
      run: testListAdminGiftsRejectsInvalidValueRange,
    },
    {
      name: "create gift persists new gift",
      run: testCreateGiftPersistsNewGift,
    },
    {
      name: "create gift rejects archived gift marked active",
      run: testCreateGiftRejectsArchivedGiftMarkedActive,
    },
    {
      name: "update gift persists changes and reorder",
      run: testUpdateGiftPersistsChangesAndReorder,
    },
    {
      name: "update gift fails when gift not found",
      run: testUpdateGiftFailsWhenGiftNotFound,
    },
    {
      name: "update gift rejects archived gift marked active",
      run: testUpdateGiftRejectsArchivedGiftMarkedActive,
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
    {
      name: "manage gift reservation releases reservation",
      run: testManageGiftReservationReleasesReservation,
    },
    {
      name: "manage gift reservation reassigns reservation",
      run: testManageGiftReservationReassignsReservation,
    },
    {
      name: "manage gift reservation fails when reservation is missing",
      run: testManageGiftReservationFailsWhenReservationNotFound,
    },
    {
      name: "manage gift reservation fails when reservation is not active",
      run: testManageGiftReservationFailsWhenReservationNotActive,
    },
    {
      name: "manage gift reservation fails when admin is missing",
      run: testManageGiftReservationFailsWhenAdminMissing,
    },
    {
      name: "manage gift reservation fails when target guest is missing",
      run: testManageGiftReservationFailsWhenTargetGuestMissing,
    },
    {
      name: "manage gift reservation fails when target guest is inactive",
      run: testManageGiftReservationFailsWhenTargetGuestInactive,
    },
    {
      name: "manage gift reservation fails when target guest is current guest",
      run: testManageGiftReservationFailsWhenTargetGuestSameAsCurrent,
    },
    {
      name: "manage gift reservation propagates reservation conflict",
      run: testManageGiftReservationPropagatesReservationConflict,
    },
  ]);
}
