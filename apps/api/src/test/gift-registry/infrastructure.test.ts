import assert from "node:assert/strict";
import type {
  Gift as PrismaGiftRecord,
  GiftReservation as PrismaGiftReservationRecord,
} from "../../generated/prisma/client.js";
import {
  PrismaGiftRepository,
  PrismaGiftReservationRepository,
} from "../../modules/gift-registry/index.js";
import { runNamedTests } from "../test-helpers.js";

async function testPrismaGiftRepository(): Promise<void> {
  const giftRecord: PrismaGiftRecord = {
    id: "gift-1",
    name: "Jogo de pratos",
    category: "casa",
    description: null,
    estimatedValue: { toNumber: () => 349.9 } as PrismaGiftRecord["estimatedValue"],
    imageUrl: null,
    displayOrder: 1,
    status: "AVAILABLE",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: any) {
      calls.push({ method: "findUnique", args });
      return giftRecord;
    },
    async findMany(args: any) {
      calls.push({ method: "findMany", args });
      return [giftRecord];
    },
    async upsert(args: any) {
      calls.push({ method: "upsert", args });
      return { ...giftRecord, ...args.update };
    },
  };

  const repository = new PrismaGiftRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaGiftRepository>[0],
  );

  assert.equal((await repository.findById("gift-1"))?.status, "available");

  const gifts = await repository.findMany({
    category: "casa",
    status: "available",
    isActive: true,
    search: "prato",
    page: 2,
    pageSize: 10,
  });

  assert.equal(gifts[0]?.estimatedValue, 349.9);
  assert.deepEqual(calls.at(-1), {
    method: "findMany",
    args: {
      where: {
        category: "casa",
        status: "AVAILABLE",
        isActive: true,
        OR: [
          { name: { contains: "prato", mode: "insensitive" } },
          { category: { contains: "prato", mode: "insensitive" } },
          { description: { contains: "prato", mode: "insensitive" } },
        ],
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip: 10,
      take: 10,
    },
  });
}

async function testPrismaGiftReservationRepository(): Promise<void> {
  const reservationRecord: PrismaGiftReservationRecord = {
    id: "reservation-1",
    giftId: "gift-1",
    guestId: "guest-1",
    reservationStatus: "ACTIVE",
    purchaseNotes: "  pago no pix  ",
    reservedAt: new Date("2026-01-01T00:00:00.000Z"),
    releasedAt: null,
    releasedByAdminUserId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: any) {
      calls.push({ method: "findUnique", args });
      return reservationRecord;
    },
    async findFirst(args: any) {
      calls.push({ method: "findFirst", args });
      return reservationRecord;
    },
    async findMany(args: any) {
      calls.push({ method: "findMany", args });
      return [reservationRecord];
    },
    async upsert(args: any) {
      calls.push({ method: "upsert", args });
      return { ...reservationRecord, ...args.update };
    },
    async create(args: any) {
      calls.push({ method: "create", args });
      return {
        ...reservationRecord,
        id: "reservation-created",
        giftId: args.data.giftId,
        guestId: args.data.guestId,
        purchaseNotes: args.data.purchaseNotes,
      };
    },
  };

  const repository = new PrismaGiftReservationRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaGiftReservationRepository>[0],
  );

  assert.equal((await repository.findById("reservation-1"))?.reservationStatus, "active");
  assert.equal((await repository.findActiveByGiftId("gift-1"))?.giftId, "gift-1");
  assert.equal(
    (
      await repository.findMany({
        giftId: "gift-1",
        guestId: "guest-1",
        reservationStatus: "active",
        page: 1,
        pageSize: 20,
      })
    )[0]?.guestId,
    "guest-1",
  );

  const created = await repository.createActiveReservation({
    giftId: "gift-2",
    guestId: "guest-2",
    purchaseNotes: "  pago no pix  ",
  });

  assert.equal(created.id, "reservation-created");
  assert.equal(created.purchaseNotes, "pago no pix");
  assert.deepEqual(calls.at(-1), {
    method: "create",
    args: {
      data: {
        giftId: "gift-2",
        guestId: "guest-2",
        reservationStatus: "ACTIVE",
        purchaseNotes: "pago no pix",
      },
    },
  });
}

export async function runGiftRegistryInfrastructureTests(): Promise<void> {
  await runNamedTests("gift-registry/infrastructure", [
    { name: "prisma gift repository", run: testPrismaGiftRepository },
    {
      name: "prisma gift reservation repository",
      run: testPrismaGiftReservationRepository,
    },
  ]);
}
