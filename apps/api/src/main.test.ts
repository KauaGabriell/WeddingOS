import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { type AppEnv, buildApp } from "./main.js";
import { REQUEST_ID_HEADER } from "./modules/shared/platform/logging/create-api-logger.js";

function createTestEnv(): AppEnv {
  return {
    NODE_ENV: "test",
    API_HOST: "127.0.0.1",
    API_PORT: 3001,
    CORS_ORIGIN: "http://localhost:3000",
    S3_ENDPOINT: "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: "weddingos-photos",
    S3_ACCESS_KEY_ID: "minioadmin",
    S3_SECRET_ACCESS_KEY: "super-secret-storage-key",
    S3_FORCE_PATH_STYLE: true,
    S3_SIGNED_URL_EXPIRES_IN_SECONDS: 900,
    corsOrigins: ["http://localhost:3000"],
  };
}

async function testEchoesIncomingRequestId(): Promise<void> {
  const app = await buildApp(createTestEnv());

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        [REQUEST_ID_HEADER]: "req-from-client",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers[REQUEST_ID_HEADER], "req-from-client");
  } finally {
    await app.close();
  }
}

async function testGeneratesRequestIdWhenMissing(): Promise<void> {
  const app = await buildApp(createTestEnv());

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    assert.equal(response.statusCode, 200);
    assert.match(
      String(response.headers[REQUEST_ID_HEADER]),
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  } finally {
    await app.close();
  }
}

async function testLogsIncludeRequestIdWithoutSensitiveHeaders(): Promise<void> {
  const logStream = new PassThrough();
  const logChunks: string[] = [];

  logStream.on("data", (chunk: Buffer | string) => {
    logChunks.push(chunk.toString());
  });

  const app = await buildApp(createTestEnv(), {
    loggerStream: logStream,
  });

  try {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        [REQUEST_ID_HEADER]: "secure-request-id",
        authorization: "Bearer top-secret-token",
        cookie: "session=top-secret-cookie",
      },
    });

    assert.equal(response.statusCode, 200);

    await new Promise<void>((resolve) => {
      logStream.end(resolve);
    });

    const serializedLogs = logChunks.join("");

    assert.match(serializedLogs, /"requestId":"secure-request-id"/);
    assert.match(serializedLogs, /request completed/);
    assert.doesNotMatch(serializedLogs, /top-secret-token/);
    assert.doesNotMatch(serializedLogs, /top-secret-cookie/);
  } finally {
    await app.close();
  }
}

async function run(): Promise<void> {
  await testEchoesIncomingRequestId();
  await testGeneratesRequestIdWhenMissing();
  await testLogsIncludeRequestIdWithoutSensitiveHeaders();
  console.log("main.test.ts passed");
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
