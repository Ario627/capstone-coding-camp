import { pino } from "pino";
import { createApp } from "./app.js";
import { connectPrisma, disconnectPrisma } from "./lib/prisma.js";
import { disconnectRedis } from "./lib/redis.js";
import { validateEnv, env } from "./config/env.config.js";

const logger = pino({ name: "server" });

async function main() {
  validateEnv();
  await connectPrisma();

  const app = createApp();
  const server = app.listen(env().PORT, () => {
    logger.info({ port: env().PORT }, "Server listening");
  });

  const shutdown = async () => {
    logger.info("Shutting down");
    server.close(() => logger.info("HTTP server closed"));
    await Promise.allSettled([disconnectPrisma(), disconnectRedis()]);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});

