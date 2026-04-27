import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageClient, StorageUploadInput, StorageUploadResult } from "./storage-client.js";

export type S3StorageClientOptions = {
  bucket: string;
  defaultSignedUrlExpiresInSeconds?: number;
  clientConfig: S3ClientConfig;
};

const PHOTO_PREFIX = "photos/";

function toPhotoKey(key: string): string {
  const normalized = key.trim().replace(/^\/+/, "");
  if (!normalized) {
    throw new Error("Storage key is required");
  }

  if (normalized.startsWith(PHOTO_PREFIX)) {
    return normalized;
  }

  return `${PHOTO_PREFIX}${normalized}`;
}

export class S3StorageClient implements StorageClient {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly defaultSignedUrlExpiresInSeconds: number;

  constructor(options: S3StorageClientOptions) {
    this.client = new S3Client(options.clientConfig);
    this.bucket = options.bucket;
    this.defaultSignedUrlExpiresInSeconds = options.defaultSignedUrlExpiresInSeconds ?? 900;
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const key = toPhotoKey(input.key);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return { key };
  }

  async delete(key: string): Promise<void> {
    const photoKey = toPhotoKey(key);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: photoKey,
      }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    const photoKey = toPhotoKey(key);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: photoKey,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds ?? this.defaultSignedUrlExpiresInSeconds,
    });
  }
}
