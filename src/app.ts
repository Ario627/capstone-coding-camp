import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.config.js";
import { generalRateLimit } from "./common/middleware/rate-limit.middleware.js";
import { errorHandler } from "./common/middleware/error-handler.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { transactionsRouter } from "./routes/transactions.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";
import { umkmRouter } from "./routes/umkm.routes.js";
import { tflRouter } from "./routes/tfl.routes.js";
import { educationRouter } from "./routes/education.routes.js";
import { aiRouter } from "./routes/ai.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env().FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "10kb" }));
  app.use(generalRateLimit());

  app.get("/health", (_req, res) => res.json({ success: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api", umkmRouter);
  app.use("/api/tfl", tflRouter);
  app.use("/api/education", educationRouter);
  app.use("/api/ai", aiRouter);

  app.use(errorHandler);
  return app;
}
