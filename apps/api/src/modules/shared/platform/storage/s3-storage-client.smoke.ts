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
    S3_ENDPOINT: process.env.S3_ENDPOINT?.trim() || "http://localhost:9000",
    S3_REGION: process.env.S3_REGION?.trim() || "us-east-1",
    S3_BUCKET: process.env.S3_BUCKET?.trim() || "weddingos-photos",
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID?.trim() || "minioadmin",
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY?.trim() || "minioadmin",
    S3_FORCE_PATH_STYLE: parseBool(process.env.S3_FORCE_PATH_STYLE, true),
    S3_SIGNED_URL_EXPIRES_IN_SECONDS: Number(process.env.S3_SIGNED_URL_EXPIRES_IN_SECONDS ?? "900"),
  });

  const key = `smoke/${randomUUID()}.txt`;
  const body = Buffer.from("weddingos-storage-smoke", "utf8");

  const uploaded = await storageClient.upload({
    key,
    body,
    contentType: "text/plain",
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
