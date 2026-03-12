import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { loginRateLimit } from "../common/middleware/rate-limit.middleware.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import { env } from "../config/env.config.js";

export const authRouter = Router();

const loginBody = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(200),
  })
  .strict();

authRouter.post("/login", loginRateLimit(), validate({ body: loginBody }), async (req, res) => {
  const { email, password } = loginBody.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, role: true },
  });

  // Avoid user enumeration: always return generic 401
  if (!user) throw new AppError(401, "Invalid credentials");

  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) throw new AppError(401, "Invalid credentials");

  const expiresIn = env().JWT_ACCESS_EXPIRY as Exclude<SignOptions["expiresIn"], undefined>;
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env().JWT_ACCESS_SECRET,
    {
      issuer: "fingrow",
      audience: "fingrow-client",
      expiresIn,
    },
  );

  res.json({
    success: true,
    data: {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    },
  });
});

