import { S3StorageClient } from "./s3-storage-client.js";
import type { StorageClient } from "./storage-client.js";

export type S3StorageEnvConfig = {
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_FORCE_PATH_STYLE: boolean;
  S3_SIGNED_URL_EXPIRES_IN_SECONDS: number;
};

export function createStorageClient(config: S3StorageEnvConfig): StorageClient {
  return new S3StorageClient({
    bucket: config.S3_BUCKET,
    defaultSignedUrlExpiresInSeconds: config.S3_SIGNED_URL_EXPIRES_IN_SECONDS,
    clientConfig: {
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION,
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      },
    },
  });
}
