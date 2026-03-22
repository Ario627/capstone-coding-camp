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
    const headerToken: string | undefined = req.header("x-csrf-token") as string

    if(!cookieToken || !headerToken) throw new AppError(403, "CSRF token missing");

    const [payload, sig] = cookieToken.split(".");
    if(!payload || !sig) throw new AppError(403, "Invalid CSRF token format");

    const secret = env().CSRF_SECRET ?? "dev-csrf-secret";
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    const aBuf = Buffer.from(sig);
    const bBuf = Buffer.from(expected);

    if(aBuf.length !== bBuf.length || !timingSafeEqual(aBuf, bBuf)) {
        throw new AppError(403, "Invalid CSRF signature");
    }

    if(headerToken !== payload) throw new AppError(403, "CSRF token mismatch");
    
    next();
}

export function generateCsrfToken(): {cookieValue: string; headerValue: string} {
    const secret = env().CSRF_SECRET ?? "dev-csrf-secret";
    const payload = randomBytes(24).toString("base64url");
    const sig = createHmac("sha256", secret).update(payload).digest("base64url");
    return {
        cookieValue: `${payload}.${sig}`,
        headerValue: payload
    }
}