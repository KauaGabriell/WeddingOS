import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { buildApp } from "../main.js";
import { MODULE_NAMES } from "../modules/index.js";
import { REQUEST_ID_HEADER } from "../modules/shared/platform/logging/create-api-logger.js";
import { createTestEnv, runNamedTests } from "./test-helpers.js";

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

async function testBuildAppKeepsModuleRegistryConnected(): Promise<void> {
  const app = await buildApp(createTestEnv());

  try {
    await app.ready();
    assert.equal(MODULE_NAMES.length, 5);
  } finally {
    await app.close();
  }
}

export async function runBootstrapTests(): Promise<void> {
  await runNamedTests("bootstrap", [
    { name: "echoes request id", run: testEchoesIncomingRequestId },
    { name: "generates request id", run: testGeneratesRequestIdWhenMissing },
    { name: "redacts sensitive headers in logs", run: testLogsIncludeRequestIdWithoutSensitiveHeaders },
    { name: "keeps module registry connected", run: testBuildAppKeepsModuleRegistryConnected },
  ]);
}
