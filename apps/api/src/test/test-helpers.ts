import type { FastifyRequest } from "fastify";
import type { AppEnv } from "../main.js";

export type NamedTestCase = {
  name: string;
  run: () => Promise<void> | void;
};

export function createTestEnv(): AppEnv {
  return {
    NODE_ENV: "test",
    API_HOST: "127.0.0.1",
    API_PORT: 3001,
    CORS_ORIGIN: "http://localhost:3000",
    STORAGE_PROVIDER: "cloudinary",
    S3_ENDPOINT: "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: "weddingos-photos",
    S3_ACCESS_KEY_ID: "minioadmin",
    S3_SECRET_ACCESS_KEY: "super-secret-storage-key",
    S3_FORCE_PATH_STYLE: true,
    S3_SIGNED_URL_EXPIRES_IN_SECONDS: 900,
    CLOUDINARY_CLOUD_NAME: "test-cloud",
    CLOUDINARY_API_KEY: "test-key",
    CLOUDINARY_API_SECRET: "test-secret",
    CLOUDINARY_FOLDER: "weddingos-test",
    CLOUDINARY_SIGNED_URL_EXPIRES_IN_SECONDS: 900,
    JWT_SECRET: "12345678901234567890123456789012",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/weddingos?schema=public",
    corsOrigins: ["http://localhost:3000"],
  };
}

export function createAuthRequest(authorization?: string, cookie?: string): FastifyRequest {
  return {
    headers: {
      ...(authorization ? { authorization } : {}),
      ...(cookie ? { cookie } : {}),
    },
    id: "req-auth-1",
    correlationId: "req-auth-1",
    auth: undefined,
  } as FastifyRequest;
}

export async function runNamedTests(
  suiteName: string,
  testCases: readonly NamedTestCase[],
): Promise<void> {
  for (const testCase of testCases) {
    try {
      await testCase.run();
    } catch (error) {
      if (error instanceof Error) {
        error.message = `[${suiteName}] ${testCase.name}: ${error.message}`;
      }

      throw error;
    }
  }
}
