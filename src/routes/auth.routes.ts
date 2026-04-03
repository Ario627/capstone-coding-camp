import { Router } from "express";
import { validate } from "../common/middleware/validate.middleware.js";
import { loginRateLimit, registrationRateLimit } from "../common/middleware/rate-limit.middleware.js";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { registerSchema, loginSchema } from "../modules/auth/auth.schema.js";
import * as authService from "../modules/auth/auth.service.js";
import { COOKIE_REFRESH_TOKEN, COOKIE_CSRF } from "../common/constants/index.js";
import { sendSuccess, sendCreated } from "../common/utils/response.util.js";
import { env } from "../config/env.config.js";
import { generateCsrfToken } from "../common/middleware/csrf.middleware.js";

export const authRouter = Router();

function setRefreshTokenCookie(res: import("express").Response, token: string): void {
  const isProduction = env().NODE_ENV === "production";
  
  console.log("[Auth] Setting refresh token cookie, isProduction:", isProduction);
  
  res.cookie(COOKIE_REFRESH_TOKEN, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function setCsrfCookie(
  res: import("express").Response,
  cookieValue: string,
): void {
  const isProduction = env().NODE_ENV === "production";

  res.cookie(COOKIE_CSRF, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

authRouter.get("/csrf-token", (_req, res) => {
  const { cookieValue, headerValue } = generateCsrfToken();
  setCsrfCookie(res, cookieValue);
  sendSuccess(res, { csrfToken: headerValue });
});

// Registration Endpoint /api/auth/register
authRouter.post("/register", registrationRateLimit(), validate({body: registerSchema}), async (req, res) => {
  const result = await authService.registerUser(req.body);
  setRefreshTokenCookie(res, result.tokens.refreshToken);
  
  const { cookieValue, headerValue } = generateCsrfToken();
  setCsrfCookie(res, cookieValue);
  
  sendCreated(res, { 
    accessToken: result.tokens.accessToken, 
    user: result.user,
    csrfToken: headerValue 
  });
});

// Login Endpoint /api/auth/login
authRouter.post("/login", loginRateLimit(), validate({ body: loginSchema }), async (req, res) => {
  console.log("[Login] Request received");
  const result = await authService.loginUser(req.body);
  console.log("[Login] Setting refresh token cookie");
  setRefreshTokenCookie(res, result.tokens.refreshToken);
  
  const { cookieValue, headerValue } = generateCsrfToken();
  setCsrfCookie(res, cookieValue);
  
  console.log("[Login] Cookie set, sending response");
  sendSuccess(res, { 
    accessToken: result.tokens.accessToken, 
    user: result.user,
    csrfToken: headerValue 
  });
});

// Refresh Token Endpoint /api/auth/refresh
authRouter.post("/refresh", async (req, res) => {
  console.log("[Refresh] Request received");
  console.log("[Refresh] Cookies:", req.cookies);
  console.log("[Refresh] Headers:", req.headers.cookie);
  
  const rt: string | undefined = req.cookies?.[COOKIE_REFRESH_TOKEN];
  console.log("[Refresh] Cookie name:", COOKIE_REFRESH_TOKEN);
  console.log("[Refresh] Refresh token found:", rt ? "YES" : "NO");
  
  const tokens = await authService.refreshToken(rt ?? "");
  setRefreshTokenCookie(res, tokens.refreshToken);
  
  const { cookieValue, headerValue } = generateCsrfToken();
  setCsrfCookie(res, cookieValue);
  
  sendSuccess(res, { 
    accessToken: tokens.accessToken,
    csrfToken: headerValue 
  });
});

// Logout Endpoint /api/auth/logout
authRouter.post("/logout", authMiddleware, async (req, res) => {
  await authService.logoutUser(req.user!.sub, req.cookies?.[COOKIE_REFRESH_TOKEN]);
  res.clearCookie(COOKIE_REFRESH_TOKEN, {path: "/"});
  res.clearCookie(COOKIE_CSRF, {path: "/"});
  sendSuccess(res, { message: "Logged out successfully" });
});

// Me endpoint /api/auth/me
authRouter.get("/me", authMiddleware, async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.sub);
  sendSuccess(res, { user });
});