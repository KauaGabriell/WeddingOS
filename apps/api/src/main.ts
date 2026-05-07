import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import type { DestinationStream } from "pino";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { PrismaClient } from "./generated/prisma/client.js";
import { MODULE_REGISTRATIONS } from "./modules/index.js";
import {
  attachRequestContext,
  logRequestCompletion,
  requestContextConfig,
} from "./modules/shared/platform/http/request-context.js";
import {
  SignedAdminMagicLinkService,
  SignedAdminSessionService,
  SignedGuestSessionService,
} from "./modules/identity-access/index.js";
import { createApiLogger } from "./modules/shared/platform/logging/create-api-logger.js";
import { createStorageClient } from "./modules/shared/platform/storage/create-storage-client.js";
import type { StorageClient } from "./modules/shared/platform/storage/storage-client.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(currentDir, "../.env") });

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  S3_ENDPOINT: z.string().min(1).default("http://localhost:9000"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(1).default("weddingos-photos"),
  S3_ACCESS_KEY_ID: z.string().min(1).default("minioadmin"),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default("minioadmin"),
  S3_FORCE_PATH_STYLE: booleanFromEnv.default(true),
  S3_SIGNED_URL_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).default(900),
  JWT_SECRET: z.string().min(32).default("CHANGE_ME_JWT_SECRET_MIN_32_CHARS"),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/weddingos?schema=public"),
});

export type AppEnv = z.infer<typeof envSchema> & { corsOrigins: string[] };
type BuildAppOptions = {
  loggerStream?: DestinationStream;
  prisma?: PrismaClient;
  storageClient?: StorageClient;
  guestSessionService?: SignedGuestSessionService;
  adminMagicLinkService?: SignedAdminMagicLinkService;
  adminSessionVerifier?: SignedAdminSessionService;
};

async function createDefaultPrismaClient(env: AppEnv) {
  try {
    const [{ PrismaPg }, { Pool }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("pg"),
    ]);
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
    });

    return new PrismaClient({
      adapter: new PrismaPg(pool),
    });
  } catch (error) {
    throw new Error(
      "Prisma PostgreSQL adapter not configured. Install `@prisma/adapter-pg` and `pg` to run the API in development/production.",
      { cause: error },
    );
  }
}

function createNoopPrismaClient(): PrismaClient {
  const noopDelegate = {
    async findUnique() {
      return null;
    },
    async findFirst() {
      return null;
    },
    async findMany() {
      return [];
    },
    async upsert(args: { create: unknown }) {
      return args.create;
    },
    async update(args: { data: unknown }) {
      return args.data;
    },
  };

  return {
    inviteToken: noopDelegate,
    guest: noopDelegate,
    guestGroup: noopDelegate,
    event: noopDelegate,
    eventGuestEligibility: noopDelegate,
    rsvpResponse: noopDelegate,
    auditLog: noopDelegate,
    async $transaction<T>(operation: (transactionClient: { inviteToken: typeof noopDelegate }) => Promise<T>) {
      return operation({
        inviteToken: noopDelegate,
      });
    },
    async $disconnect() {},
  } as unknown as PrismaClient;
}

export function loadEnv(): AppEnv {
  const parsed = envSchema.parse(process.env);

  return {
    ...parsed,
    corsOrigins: parsed.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export async function buildApp(env: AppEnv, options: BuildAppOptions = {}) {
  const app = Fastify({
    ...requestContextConfig,
    loggerInstance: createApiLogger({
      level: options.loggerStream ? "info" : env.NODE_ENV === "test" ? "silent" : "info",
      stream: options.loggerStream,
    }),
  });
  const storageClient = options.storageClient ?? createStorageClient(env);
  const prisma =
    options.prisma ??
    (env.NODE_ENV === "test" ? createNoopPrismaClient() : await createDefaultPrismaClient(env));
  const guestSessionService =
    options.guestSessionService ?? new SignedGuestSessionService(env.JWT_SECRET);
  const adminMagicLinkService =
    options.adminMagicLinkService ?? new SignedAdminMagicLinkService(env.JWT_SECRET);
  const adminSessionVerifier =
    options.adminSessionVerifier ?? new SignedAdminSessionService(env.JWT_SECRET);
  const adminSessionService = adminSessionVerifier;
  app.decorate("prisma", prisma);
  app.decorate("storageClient", storageClient);
  app.decorate("guestSessionService", guestSessionService);
  app.decorate("adminMagicLinkService", adminMagicLinkService);
  app.decorate("adminSessionVerifier", adminSessionVerifier);
  app.decorate("adminSessionService", adminSessionService);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook("onRequest", attachRequestContext);
  app.addHook("onResponse", logRequestCompletion);

  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get("/health", {
    schema: {
      response: {
        200: z.object({
          status: z.literal("ok"),
          service: z.literal("weddingos-api"),
          uptime: z.number(),
        }),
      },
    },
    handler: async () => ({
      status: "ok" as const,
      service: "weddingos-api" as const,
      uptime: process.uptime(),
    }),
  });

  for (const registerModule of MODULE_REGISTRATIONS) {
    await app.register(registerModule);
  }

  return app;
}

export async function bootstrap(): Promise<void> {
  try {
    const env = loadEnv();
    const app = await buildApp(env);

    const address = await app.listen({
      host: env.API_HOST,
      port: env.API_PORT,
    });

    app.log.info({ address }, "API listening");

    const shutdown = async (signal: string) => {
      app.log.info({ signal }, "Gracefully shutting down API");
      await app.close();
      process.exit(0);
    };

    process.once("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.once("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

const isMainModule =
  typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  void bootstrap();
}
