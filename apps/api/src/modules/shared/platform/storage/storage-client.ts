export type StorageUploadInput = {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
};

export type StorageUploadResult = {
  key: string;
};

export interface StorageClient {
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
