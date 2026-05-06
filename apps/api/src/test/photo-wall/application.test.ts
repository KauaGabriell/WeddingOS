import assert from "node:assert/strict";
import type { PhotoPost } from "../../modules/photo-wall/index.js";
import {
  PhotoWallApplicationError,
  createCreatePhotoPostUseCase,
} from "../../modules/photo-wall/index.js";
import { runNamedTests } from "../test-helpers.js";

const activeGuest = {
  id: "guest-1",
  status: "active" as const,
};

const inactiveGuest = {
  id: "guest-2",
  status: "inactive" as const,
};

async function testCreatePhotoPostCreatesPendingPost(): Promise<void> {
  const fileBody = Buffer.from("photo-bytes");
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById(guestId: string) {
        assert.equal(guestId, "guest-1");
        return activeGuest;
      },
    },
    photoStorageProvider: {
      async uploadPhoto(input: {
        fileName: string;
        body: Buffer | Uint8Array;
        contentType: string;
      }) {
        assert.equal(input.fileName, "casamento.jpg");
        assert.equal(input.body, fileBody);
        assert.equal(input.contentType, "image/jpeg");
        return {
          mediaStorageKey: "photos/casamento.jpg",
          mediaUrl: "https://signed.example.com/photos/casamento.jpg",
        };
      },
    },
    photoPostRepository: {
      async save(entity: PhotoPost) {
        assert.match(entity.id, /^[0-9a-f-]{36}$/);
        assert.equal(entity.guestId, "guest-1");
        assert.equal(entity.authorName, "Joao");
        assert.equal(entity.message, "Parabens aos noivos");
        assert.equal(entity.mediaStorageKey, "photos/casamento.jpg");
        assert.equal(entity.mediaUrl, null);
        assert.equal(entity.mediaMimeType, "image/jpeg");
        assert.equal(entity.mediaSizeBytes, 2048);
        assert.equal(entity.mediaWidth, 1080);
        assert.equal(entity.mediaHeight, 720);
        assert.equal(entity.moderationStatus, "pending");
        assert.equal(entity.approvedAt, null);
        assert.equal(entity.hiddenAt, null);
        assert.equal(entity.moderatedByAdminUserId, null);
        assert.ok(entity.submittedAt instanceof Date);
        assert.ok(entity.createdAt instanceof Date);
        assert.ok(entity.updatedAt instanceof Date);
        return entity;
      },
    },
  });

  const result = await useCase.execute({
    guestId: "guest-1",
    authorName: "  Joao  ",
    message: "  Parabens aos noivos  ",
    fileName: "casamento.jpg",
    fileBody,
    mediaMimeType: "image/jpeg",
    mediaSizeBytes: 2048,
    mediaWidth: 1080,
    mediaHeight: 720,
  });

  assert.equal(result.photoPost.guestId, "guest-1");
  assert.equal(result.photoPost.authorName, "Joao");
  assert.equal(result.photoPost.message, "Parabens aos noivos");
  assert.equal(result.photoPost.mediaUrl, null);
  assert.equal(result.photoPost.moderationStatus, "pending");
  assert.equal(result.mediaUrl, "https://signed.example.com/photos/casamento.jpg");
}

async function testCreatePhotoPostRejectsUnknownGuest(): Promise<void> {
  let uploadCalled = false;
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return null;
      },
    },
    photoStorageProvider: {
      async uploadPhoto() {
        uploadCalled = true;
        throw new Error("should not upload");
      },
    },
    photoPostRepository: {
      async save() {
        throw new Error("should not save");
      },
    },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        guestId: "missing-guest",
        authorName: "Joao",
        message: "Parabens",
        fileName: "casamento.jpg",
        fileBody: Buffer.from("photo"),
        mediaMimeType: "image/jpeg",
        mediaSizeBytes: 1024,
      }),
    (error) => {
      assert.ok(error instanceof PhotoWallApplicationError);
      assert.equal(error.reason, "guest_not_found");
      assert.equal(error.statusCode, 404);
      assert.equal(uploadCalled, false);
      return true;
    },
  );
}

async function testCreatePhotoPostRejectsInactiveGuest(): Promise<void> {
  let uploadCalled = false;
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return inactiveGuest;
      },
    },
    photoStorageProvider: {
      async uploadPhoto() {
        uploadCalled = true;
        throw new Error("should not upload");
      },
    },
    photoPostRepository: {
      async save() {
        throw new Error("should not save");
      },
    },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        guestId: "guest-2",
        authorName: "Maria",
        message: "Parabens",
        fileName: "casamento.jpg",
        fileBody: Buffer.from("photo"),
        mediaMimeType: "image/jpeg",
        mediaSizeBytes: 1024,
      }),
    (error) => {
      assert.ok(error instanceof PhotoWallApplicationError);
      assert.equal(error.reason, "guest_inactive");
      assert.equal(error.statusCode, 403);
      assert.equal(uploadCalled, false);
      return true;
    },
  );
}

async function testCreatePhotoPostPropagatesUploadError(): Promise<void> {
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return activeGuest;
      },
    },
    photoStorageProvider: {
      async uploadPhoto() {
        throw new Error("upload failed");
      },
    },
    photoPostRepository: {
      async save() {
        throw new Error("should not save");
      },
    },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        guestId: "guest-1",
        authorName: "Joao",
        message: "Parabens",
        fileName: "casamento.jpg",
        fileBody: Buffer.from("photo"),
        mediaMimeType: "image/jpeg",
        mediaSizeBytes: 1024,
      }),
    /upload failed/,
  );
}

async function testCreatePhotoPostPropagatesSaveError(): Promise<void> {
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return activeGuest;
      },
    },
    photoStorageProvider: {
      async uploadPhoto() {
        return {
          mediaStorageKey: "photos/casamento.jpg",
          mediaUrl: "https://signed.example.com/photos/casamento.jpg",
        };
      },
    },
    photoPostRepository: {
      async save() {
        throw new Error("save failed");
      },
    },
  });

  await assert.rejects(
    () =>
      useCase.execute({
        guestId: "guest-1",
        authorName: "Joao",
        message: "Parabens",
        fileName: "casamento.jpg",
        fileBody: Buffer.from("photo"),
        mediaMimeType: "image/jpeg",
        mediaSizeBytes: 1024,
      }),
    /save failed/,
  );
}

export async function runPhotoWallApplicationTests(): Promise<void> {
  await runNamedTests("photo-wall/application", [
    {
      name: "create photo post creates pending post",
      run: testCreatePhotoPostCreatesPendingPost,
    },
    {
      name: "create photo post rejects unknown guest",
      run: testCreatePhotoPostRejectsUnknownGuest,
    },
    {
      name: "create photo post rejects inactive guest",
      run: testCreatePhotoPostRejectsInactiveGuest,
    },
    {
      name: "create photo post propagates upload error",
      run: testCreatePhotoPostPropagatesUploadError,
    },
    {
      name: "create photo post propagates save error",
      run: testCreatePhotoPostPropagatesSaveError,
    },
  ]);
}
