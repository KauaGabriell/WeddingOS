import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createStorageClient } from "./create-storage-client.js";

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "true";
}

async function run(): Promise<void> {
  const storageClient = createStorageClient({
    STORAGE_PROVIDER:
      process.env.STORAGE_PROVIDER?.trim().toLowerCase() === "s3" ? "s3" : "cloudinary",
    S3_ENDPOINT: process.env.S3_ENDPOINT?.trim() || "http://localhost:9000",
    S3_REGION: process.env.S3_REGION?.trim() || "us-east-1",
    S3_BUCKET: process.env.S3_BUCKET?.trim() || "weddingos-photos",
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID?.trim() || "minioadmin",
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY?.trim() || "minioadmin",
    S3_FORCE_PATH_STYLE: parseBool(process.env.S3_FORCE_PATH_STYLE, true),
    S3_SIGNED_URL_EXPIRES_IN_SECONDS: Number(process.env.S3_SIGNED_URL_EXPIRES_IN_SECONDS ?? "900"),
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME?.trim() || "CHANGE_ME_CLOUDINARY_CLOUD_NAME",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY?.trim() || "CHANGE_ME_CLOUDINARY_API_KEY",
    CLOUDINARY_API_SECRET:
      process.env.CLOUDINARY_API_SECRET?.trim() || "CHANGE_ME_CLOUDINARY_API_SECRET",
    CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER?.trim() || "weddingos-dev",
    CLOUDINARY_SIGNED_URL_EXPIRES_IN_SECONDS: Number(
      process.env.CLOUDINARY_SIGNED_URL_EXPIRES_IN_SECONDS ?? "900",
    ),
  });

  const key = `smoke/${randomUUID()}.png`;
  const body = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax8WQAAAABJRU5ErkJggg==",
    "base64",
  );

  const uploaded = await storageClient.upload({
    key,
    body,
    contentType: "image/png",
  });

  const signedUrl = await storageClient.getSignedUrl(uploaded.key);
  await storageClient.delete(uploaded.key);

  console.log("storage smoke ok");
  console.log(`key=${uploaded.key}`);
  console.log(`signedUrl=${signedUrl}`);
}

run().catch((error) => {
  console.error("storage smoke failed");
  console.error(error);
  process.exit(1);
});
