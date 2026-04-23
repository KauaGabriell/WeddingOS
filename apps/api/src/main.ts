export function bootstrap(): void {
  // Fastify bootstrap will be implemented in task 1.4.
  console.log("[weddingos-api] bootstrap placeholder");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap();
}