import { Router } from "express";
import { validate } from "../common/middleware/validate.middleware.js";
import { loginRateLimit, registrationRateLimit } from "../common/middleware/rate-limit.middleware.js";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { registerSchema, loginSchema } from "../modules/auth/auth.schema.js";
import * as authService from "../modules/auth/auth.service.js";
import { COOKIE_REFRESH_TOKEN } from "../common/constants/index.js";
import { sendSuccess, sendCreated } from "../common/utils/response.util.js";
import { env } from "../config/env.config.js";

export const authRouter = Router();

function setRefreshTokenCookie(res: import("express").Response, token: string): void {
  res.cookie(COOKIE_REFRESH_TOKEN, token, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 86_400_000,
  });
}

// Registration Endpoint /api/register
authRouter.post("/register", registrationRateLimit(), validate({body: registerSchema}), async (req, res) => {
  const result = await authService.registerUser(req.body);
  setRefreshTokenCookie(res, result.tokens.refreshToken);
  sendCreated(res, { accessToken: result.tokens.accessToken, user: result.user});
});

// Login Endpoint /api/login
authRouter.post("/login", loginRateLimit(), validate({ body: loginSchema }), async (req, res) => {
  const result = await authService.loginUser(req.body);
  setRefreshTokenCookie(res, result.tokens.refreshToken);
  sendSuccess(res, { accessToken: result.tokens.accessToken, user: result.user });
});

// Refresh Token Endpoint /api/refresh
authRouter.post("/refresh", async (req, res) => {
  const rt: string | undefined = req.cookies?.[COOKIE_REFRESH_TOKEN];
  const tokens = await authService.refreshToken(rt ?? "");
  setRefreshTokenCookie(res, tokens.refreshToken);
  sendSuccess(res, { accessToken: tokens.accessToken });
});

// Logout Endpoint /api/logout
authRouter.post("/logout", authMiddleware, async (req, res) => {
  await authService.logoutUser(req.user!.sub, req.cookies?.[COOKIE_REFRESH_TOKEN]);
  res.clearCookie(COOKIE_REFRESH_TOKEN, {path: "/"});
  sendSuccess(res, { message: "Logged out successfully" });
});

// Me endpoint /api/me
authRouter.get("/me", authMiddleware, async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.sub);
  sendSuccess(res, { user });
})