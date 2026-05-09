import { randomUUID } from "node:crypto";
import type { StorageClient } from "../../shared/index.js";

export interface UploadPhotoInput {
  readonly fileName: string;
  readonly body: Buffer | Uint8Array;
  readonly contentType: string;
}

export interface UploadPhotoResult {
  readonly mediaStorageKey: string;
  readonly mediaUrl: string;
}

export interface PhotoStorageProvider {
  uploadPhoto(input: UploadPhotoInput): Promise<UploadPhotoResult>;
  getSignedMediaUrl(
    storageKey: string,
    expiresInSeconds?: number,
  ): Promise<string>;
}

export class StorageBackedPhotoStorageProvider implements PhotoStorageProvider {
  constructor(private readonly storageClient: StorageClient) {}

  async uploadPhoto(input: UploadPhotoInput): Promise<UploadPhotoResult> {
    const extension = input.fileName.trim().toLowerCase().match(/\.(jpe?g|png)$/)?.[0] ?? ".jpg";
    const key = `photos/${randomUUID()}${extension}`; // <-- key estável e única

    const uploaded = await this.storageClient.upload({
      key,
      body: input.body,
      contentType: input.contentType,
    });
    const mediaUrl = await this.storageClient.getSignedUrl(uploaded.key);

    return {
      mediaStorageKey: uploaded.key,
      mediaUrl,
    };
  }

  getSignedMediaUrl(storageKey: string, expiresInSeconds?: number): Promise<string> {
    return this.storageClient.getSignedUrl(storageKey, expiresInSeconds);
  }
}
