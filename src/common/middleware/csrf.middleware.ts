import type { Request, Response, NextFunction } from "express";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.config.js";
import { AppError } from "./error-handler.middleware.js";
import { COOKIE_CSRF } from "../constants/index.js";

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
    if(["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) {
        return next();
    }

    const cookieToken: string | undefined = req.cookies[COOKIE_CSRF];
    const headerToken: string | undefined = req.header["x-csrf-token"] as string

}