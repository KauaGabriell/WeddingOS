import Fastify from "fastify";
import cors from "@fastify/cors";
import { pathToFileURL } from "node:url";
import {
  validatorCompiler,
  serializerCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

type AppEnv = z.infer<typeof envSchema> & { corsOrigins: string[] };

export function loadEnv(): AppEnv {
  const parsed = envSchema.parse(process.env);

  return {
    ...parsed,
    corsOrigins: parsed.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export async function buildApp(env: AppEnv) {
  const app = Fastify({
    logger: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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

    app.log.info(`API listening at ${address}`);

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
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  void bootstrap();
}
