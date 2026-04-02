import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.config.js";
import { generalRateLimit } from "./common/middleware/rate-limit.middleware.js";
import { errorHandler } from "./common/middleware/error-handler.middleware.js";
import { csrfMiddleware } from "./common/middleware/csrf.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { transactionsRouter } from "./routes/transactions.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";
import { umkmRouter } from "./routes/umkm.routes.js";
import { tflRouter } from "./routes/tfl.routes.js";
import { educationRouter } from "./routes/education.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { consultantRouter } from "./routes/consultant.routes.js";
import { walletRouter } from "./routes/wallet.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use((helmet as any).default ? (helmet as any).default() : (helmet as any)());    
  app.use(
    cors({
      origin: env().FRONTEND_URL,
      credentials: true,
    })  
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "10kb" }));
  app.use(generalRateLimit());

  app.get("/health", (_req, res) => res.json({ success: true }));

  app.use("/api/wallet", walletRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/transactions", csrfMiddleware, transactionsRouter);
  app.use("/api/payments", csrfMiddleware, paymentRouter);
  app.use("/api", csrfMiddleware, umkmRouter);
  app.use("/api/tfl", csrfMiddleware, tflRouter);
  app.use("/api/education", csrfMiddleware, educationRouter);
  app.use("/api/ai", csrfMiddleware, aiRouter);
  app.use("/api/consultant", csrfMiddleware, consultantRouter);
  app.use("/api/umkm", csrfMiddleware, umkmRouter);
  

  app.use(errorHandler);
  return app;
}
