import assert from "node:assert/strict";
import type { PhotoPost as PrismaPhotoPostRecord } from "../../generated/prisma/client.js";
import { PrismaPhotoPostRepository } from "../../modules/photo-wall/index.js";
import { runNamedTests } from "../test-helpers.js";

async function testPrismaPhotoPostRepository(): Promise<void> {
  const photoPostRecord: PrismaPhotoPostRecord = {
    id: "post-1",
    guestId: "guest-1",
    authorName: "Joao",
    message: "Parabens",
    mediaStorageKey: "photos/post-1.jpg",
    mediaUrl: null,
    mediaMimeType: "image/jpeg",
    mediaSizeBytes: 1024,
    mediaWidth: null,
    mediaHeight: null,
    moderationStatus: "PENDING",
    submittedAt: new Date("2026-01-03T00:00:00.000Z"),
    approvedAt: null,
    hiddenAt: null,
    moderatedByAdminUserId: null,
    createdAt: new Date("2026-01-03T00:00:00.000Z"),
    updatedAt: new Date("2026-01-04T00:00:00.000Z"),
  };
  const calls: Record<string, unknown>[] = [];
  const delegate = {
    async findUnique(args: any) {
      calls.push({ method: "findUnique", args });
      return photoPostRecord;
    },
    async findMany(args: any) {
      calls.push({ method: "findMany", args });
      return [photoPostRecord];
    },
    async upsert(args: any) {
      calls.push({ method: "upsert", args });
      return { ...photoPostRecord, ...args.update };
    },
  };

  const repository = new PrismaPhotoPostRepository(
    delegate as unknown as ConstructorParameters<typeof PrismaPhotoPostRepository>[0],
  );

  assert.equal((await repository.findById("post-1"))?.moderationStatus, "pending");
  assert.equal((await repository.findById("post-1"))?.submittedAt.toISOString(), "2026-01-03T00:00:00.000Z");

  const posts = await repository.findMany({
    guestId: "guest-1",
    moderationStatus: "approved",
    page: 2,
    pageSize: 10,
  });

  assert.equal(posts[0]?.moderationStatus, "pending");
  assert.deepEqual(calls.at(-1), {
    method: "findMany",
    args: {
      where: {
        guestId: "guest-1",
        moderationStatus: "APPROVED",
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      skip: 10,
      take: 10,
    },
  });

  const saved = await repository.save({
    id: "post-2",
    guestId: "guest-2",
    authorName: "Maria",
    message: "Felicidades",
    mediaStorageKey: "photos/post-2.png",
    mediaUrl: "https://cdn.example.com/post-2.png",
    mediaMimeType: "image/png",
    mediaSizeBytes: 2048,
    mediaWidth: 1080,
    mediaHeight: 720,
    moderationStatus: "approved",
    submittedAt: new Date("2026-01-05T00:00:00.000Z"),
    approvedAt: new Date("2026-01-05T00:05:00.000Z"),
    hiddenAt: null,
    moderatedByAdminUserId: "admin-1",
    createdAt: new Date("2026-01-05T00:00:00.000Z"),
    updatedAt: new Date("2026-01-05T00:06:00.000Z"),
  });

  assert.equal(saved.moderationStatus, "approved");
  assert.equal(saved.mediaUrl, "https://cdn.example.com/post-2.png");
  assert.deepEqual(calls.at(-1), {
    method: "upsert",
    args: {
      where: { id: "post-2" },
      create: {
        id: "post-2",
        guestId: "guest-2",
        authorName: "Maria",
        message: "Felicidades",
        mediaStorageKey: "photos/post-2.png",
        mediaUrl: "https://cdn.example.com/post-2.png",
        mediaMimeType: "image/png",
        mediaSizeBytes: 2048,
        mediaWidth: 1080,
        mediaHeight: 720,
        moderationStatus: "APPROVED",
        submittedAt: new Date("2026-01-05T00:00:00.000Z"),
        approvedAt: new Date("2026-01-05T00:05:00.000Z"),
        hiddenAt: null,
        moderatedByAdminUserId: "admin-1",
        createdAt: new Date("2026-01-05T00:00:00.000Z"),
        updatedAt: new Date("2026-01-05T00:06:00.000Z"),
      },
      update: {
        id: "post-2",
        guestId: "guest-2",
        authorName: "Maria",
        message: "Felicidades",
        mediaStorageKey: "photos/post-2.png",
        mediaUrl: "https://cdn.example.com/post-2.png",
        mediaMimeType: "image/png",
        mediaSizeBytes: 2048,
        mediaWidth: 1080,
        mediaHeight: 720,
        moderationStatus: "APPROVED",
        submittedAt: new Date("2026-01-05T00:00:00.000Z"),
        approvedAt: new Date("2026-01-05T00:05:00.000Z"),
        hiddenAt: null,
        moderatedByAdminUserId: "admin-1",
        createdAt: new Date("2026-01-05T00:00:00.000Z"),
        updatedAt: new Date("2026-01-05T00:06:00.000Z"),
      },
    },
  });
}

export async function runPhotoWallInfrastructureTests(): Promise<void> {
  await runNamedTests("photo-wall/infrastructure", [
    {
      name: "prisma photo post repository",
      run: testPrismaPhotoPostRepository,
    },
  ]);
}
