import assert from "node:assert/strict";
import type { PhotoPost } from "../../modules/photo-wall/index.js";
import {
  PhotoWallApplicationError,
  createCreatePhotoPostUseCase,
  createListApprovedPhotoPostsUseCase,
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

function createValidCreatePhotoPostInput(
  overrides: Partial<Parameters<ReturnType<typeof createCreatePhotoPostUseCase>["execute"]>[0]> = {},
) {
  return {
    guestId: "guest-1",
    authorName: "Joao",
    message: "Parabens",
    fileName: "casamento.jpg",
    fileBody: Buffer.from("photo"),
    mediaMimeType: "image/jpeg",
    mediaSizeBytes: 1024,
    ...overrides,
  };
}

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

async function testCreatePhotoPostAcceptsJpegExtension(): Promise<void> {
  let uploadCalled = false;
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return activeGuest;
      },
    },
    photoStorageProvider: {
      async uploadPhoto() {
        uploadCalled = true;
        return {
          mediaStorageKey: "photos/casamento.jpeg",
          mediaUrl: "https://signed.example.com/photos/casamento.jpeg",
        };
      },
    },
    photoPostRepository: {
      async save(entity: PhotoPost) {
        return entity;
      },
    },
  });

  const result = await useCase.execute(
    createValidCreatePhotoPostInput({
      fileName: "casamento.jpeg",
      mediaMimeType: "image/jpeg",
    }),
  );

  assert.equal(uploadCalled, true);
  assert.equal(result.photoPost.mediaMimeType, "image/jpeg");
}

async function testCreatePhotoPostAcceptsPngExtension(): Promise<void> {
  let uploadCalled = false;
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return activeGuest;
      },
    },
    photoStorageProvider: {
      async uploadPhoto() {
        uploadCalled = true;
        return {
          mediaStorageKey: "photos/casamento.png",
          mediaUrl: "https://signed.example.com/photos/casamento.png",
        };
      },
    },
    photoPostRepository: {
      async save(entity: PhotoPost) {
        return entity;
      },
    },
  });

  const result = await useCase.execute(
    createValidCreatePhotoPostInput({
      fileName: "casamento.png",
      mediaMimeType: "image/png",
    }),
  );

  assert.equal(uploadCalled, true);
  assert.equal(result.photoPost.mediaMimeType, "image/png");
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

async function testCreatePhotoPostRejectsUnsupportedMediaType(): Promise<void> {
  let uploadCalled = false;
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return activeGuest;
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
      useCase.execute(
        createValidCreatePhotoPostInput({
          fileName: "casamento.gif",
          mediaMimeType: "image/gif",
        }),
      ),
    (error) => {
      assert.ok(error instanceof PhotoWallApplicationError);
      assert.equal(error.reason, "unsupported_media_type");
      assert.equal(error.statusCode, 400);
      assert.equal(uploadCalled, false);
      return true;
    },
  );
}

async function testCreatePhotoPostRejectsUnsupportedFileExtension(): Promise<void> {
  let uploadCalled = false;
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return activeGuest;
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
      useCase.execute(
        createValidCreatePhotoPostInput({
          fileName: "casamento.heic",
          mediaMimeType: "image/jpeg",
        }),
      ),
    (error) => {
      assert.ok(error instanceof PhotoWallApplicationError);
      assert.equal(error.reason, "unsupported_file_extension");
      assert.equal(error.statusCode, 400);
      assert.equal(uploadCalled, false);
      return true;
    },
  );
}

async function testCreatePhotoPostRejectsMediaTypeExtensionMismatch(): Promise<void> {
  let uploadCalled = false;
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return activeGuest;
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
      useCase.execute(
        createValidCreatePhotoPostInput({
          fileName: "casamento.png",
          mediaMimeType: "image/jpeg",
        }),
      ),
    (error) => {
      assert.ok(error instanceof PhotoWallApplicationError);
      assert.equal(error.reason, "media_type_extension_mismatch");
      assert.equal(error.statusCode, 400);
      assert.equal(uploadCalled, false);
      return true;
    },
  );
}

async function testCreatePhotoPostRejectsFileTooLarge(): Promise<void> {
  let uploadCalled = false;
  const useCase = createCreatePhotoPostUseCase({
    guestRepository: {
      async findById() {
        return activeGuest;
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
      useCase.execute(
        createValidCreatePhotoPostInput({
          mediaSizeBytes: 10 * 1024 * 1024 + 1,
        }),
      ),
    (error) => {
      assert.ok(error instanceof PhotoWallApplicationError);
      assert.equal(error.reason, "file_too_large");
      assert.equal(error.statusCode, 400);
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

async function testListApprovedPhotoPostsUsesDefaultPaginationAndMapsPublicItems(): Promise<void> {
  const approvedPost: PhotoPost = {
    id: "post-1",
    guestId: "guest-1",
    authorName: "Joao",
    message: "Parabens",
    mediaStorageKey: "photos/post-1.jpg",
    mediaUrl: null,
    mediaMimeType: "image/jpeg",
    mediaSizeBytes: 1024,
    mediaWidth: 1080,
    mediaHeight: 720,
    moderationStatus: "approved",
    submittedAt: new Date("2026-01-03T00:00:00.000Z"),
    approvedAt: new Date("2026-01-03T00:05:00.000Z"),
    hiddenAt: null,
    moderatedByAdminUserId: "admin-1",
    createdAt: new Date("2026-01-03T00:00:00.000Z"),
    updatedAt: new Date("2026-01-03T00:05:00.000Z"),
  };
  const repositoryCalls: Record<string, unknown>[] = [];
  const signedUrlCalls: Record<string, unknown>[] = [];
  const useCase = createListApprovedPhotoPostsUseCase({
    photoPostRepository: {
      async findMany(filter: {
        moderationStatus?: "pending" | "approved" | "hidden" | "removed";
        page: number;
        pageSize: number;
      }) {
        repositoryCalls.push(filter as Record<string, unknown>);
        return [approvedPost];
      },
    },
    photoStorageProvider: {
      async getSignedMediaUrl(storageKey: string, expiresInSeconds?: number) {
        signedUrlCalls.push({ storageKey, expiresInSeconds });
        return `https://signed.example.com/${storageKey}`;
      },
    },
  });

  const result = await useCase.execute({});

  assert.deepEqual(repositoryCalls[0], {
    moderationStatus: "approved",
    page: 1,
    pageSize: 20,
  });
  assert.deepEqual(signedUrlCalls[0], {
    storageKey: "photos/post-1.jpg",
    expiresInSeconds: undefined,
  });
  assert.deepEqual(result, {
    items: [
      {
        id: "post-1",
        authorName: "Joao",
        message: "Parabens",
        mediaUrl: "https://signed.example.com/photos/post-1.jpg",
        mediaMimeType: "image/jpeg",
        mediaWidth: 1080,
        mediaHeight: 720,
        submittedAt: new Date("2026-01-03T00:00:00.000Z"),
      },
    ],
    page: 1,
    pageSize: 20,
  });
  assert.equal("guestId" in result.items[0]!, false);
  assert.equal("mediaStorageKey" in result.items[0]!, false);
  assert.equal("moderationStatus" in result.items[0]!, false);
}

async function testListApprovedPhotoPostsUsesCustomPagination(): Promise<void> {
  const useCase = createListApprovedPhotoPostsUseCase({
    photoPostRepository: {
      async findMany(filter: {
        moderationStatus?: "pending" | "approved" | "hidden" | "removed";
        page: number;
        pageSize: number;
      }) {
        assert.deepEqual(filter, {
          moderationStatus: "approved",
          page: 3,
          pageSize: 5,
        });
        return [];
      },
    },
    photoStorageProvider: {
      async getSignedMediaUrl() {
        throw new Error("not used");
      },
    },
  });

  const result = await useCase.execute({
    page: 3,
    pageSize: 5,
  });

  assert.deepEqual(result, {
    items: [],
    page: 3,
    pageSize: 5,
  });
}

async function testListApprovedPhotoPostsPropagatesSignedUrlError(): Promise<void> {
  const approvedPost: PhotoPost = {
    id: "post-1",
    guestId: "guest-1",
    authorName: "Joao",
    message: "Parabens",
    mediaStorageKey: "photos/post-1.jpg",
    mediaUrl: null,
    mediaMimeType: "image/jpeg",
    mediaSizeBytes: 1024,
    mediaWidth: 1080,
    mediaHeight: 720,
    moderationStatus: "approved",
    submittedAt: new Date("2026-01-03T00:00:00.000Z"),
    approvedAt: new Date("2026-01-03T00:05:00.000Z"),
    hiddenAt: null,
    moderatedByAdminUserId: "admin-1",
    createdAt: new Date("2026-01-03T00:00:00.000Z"),
    updatedAt: new Date("2026-01-03T00:05:00.000Z"),
  };
  const useCase = createListApprovedPhotoPostsUseCase({
    photoPostRepository: {
      async findMany() {
        return [approvedPost];
      },
    },
    photoStorageProvider: {
      async getSignedMediaUrl() {
        throw new Error("signed url failed");
      },
    },
  });

  await assert.rejects(() => useCase.execute({}), /signed url failed/);
}

export async function runPhotoWallApplicationTests(): Promise<void> {
  await runNamedTests("photo-wall/application", [
    {
      name: "create photo post creates pending post",
      run: testCreatePhotoPostCreatesPendingPost,
    },
    {
      name: "create photo post accepts jpeg extension",
      run: testCreatePhotoPostAcceptsJpegExtension,
    },
    {
      name: "create photo post accepts png extension",
      run: testCreatePhotoPostAcceptsPngExtension,
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
      name: "create photo post rejects unsupported media type",
      run: testCreatePhotoPostRejectsUnsupportedMediaType,
    },
    {
      name: "create photo post rejects unsupported file extension",
      run: testCreatePhotoPostRejectsUnsupportedFileExtension,
    },
    {
      name: "create photo post rejects media type extension mismatch",
      run: testCreatePhotoPostRejectsMediaTypeExtensionMismatch,
    },
    {
      name: "create photo post rejects file too large",
      run: testCreatePhotoPostRejectsFileTooLarge,
    },
    {
      name: "create photo post propagates upload error",
      run: testCreatePhotoPostPropagatesUploadError,
    },
    {
      name: "create photo post propagates save error",
      run: testCreatePhotoPostPropagatesSaveError,
    },
    {
      name: "list approved photo posts uses default pagination and maps public items",
      run: testListApprovedPhotoPostsUsesDefaultPaginationAndMapsPublicItems,
    },
    {
      name: "list approved photo posts uses custom pagination",
      run: testListApprovedPhotoPostsUsesCustomPagination,
    },
    {
      name: "list approved photo posts propagates signed url error",
      run: testListApprovedPhotoPostsPropagatesSignedUrlError,
    },
  ]);
}
