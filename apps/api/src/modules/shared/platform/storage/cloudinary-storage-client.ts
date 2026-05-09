import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";
import type { StorageClient, StorageUploadInput, StorageUploadResult } from "./storage-client.js";

type CloudinaryStorageClientOptions = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
  defaultSignedUrlExpiresInSeconds?: number;
};

function normalizeKey(key: string): string {
  const normalized = key.trim().replace(/^\/+/, "");
  if (!normalized) {
    throw new Error("Storage key is required");
  }

  return normalized;
}

function bufferFromBody(body: Buffer | Uint8Array): Buffer {
  return Buffer.isBuffer(body) ? body : Buffer.from(body);
}

export class CloudinaryStorageClient implements StorageClient {
  private readonly folder: string;
  private readonly defaultSignedUrlExpiresInSeconds: number;

  constructor(options: CloudinaryStorageClientOptions) {
    cloudinary.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
      secure: true,
    });

    this.folder = options.folder.trim().replace(/^\/+|\/+$/g, "");
    this.defaultSignedUrlExpiresInSeconds = options.defaultSignedUrlExpiresInSeconds ?? 900;
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const key = normalizeKey(input.key);
    const publicId = `${this.folder}/${key}`.replace(/\/{2,}/g, "/");
    const payload = bufferFromBody(input.body);
    const dataUri = `data:${input.contentType};base64,${payload.toString("base64")}`;

    const uploadOptions: UploadApiOptions = {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: "image",
      type: "authenticated",
    };

    await cloudinary.uploader.upload(dataUri, uploadOptions);

    return { key };
  }

  async delete(key: string): Promise<void> {
    const normalizedKey = normalizeKey(key);
    const publicId = `${this.folder}/${normalizedKey}`.replace(/\/{2,}/g, "/");

    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      type: "authenticated",
      invalidate: true,
    });
  }

  async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    const normalizedKey = normalizeKey(key);
    const publicId = `${this.folder}/${normalizedKey}`.replace(/\/{2,}/g, "/");
    const ttl = expiresInSeconds ?? this.defaultSignedUrlExpiresInSeconds;
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + ttl;

    return cloudinary.url(publicId, {
      resource_type: "image",
      type: "authenticated",
      secure: true,
      sign_url: true,
      expires_at: expiresAtSeconds,
    });
  }
}
