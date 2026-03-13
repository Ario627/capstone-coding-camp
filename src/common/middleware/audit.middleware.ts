import type { Request, Response, NextFunction } from "express";
import {prisma} from "../../lib/prisma.js";
import { AppError } from "./error-handler.middleware.js";
import { Prisma } from "@prisma/client";

export async function auditMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) return next();

    const originJson = res.json.bind(res);
    res.json = function (body: unknown) {
        const rawId = req.params?.id;
        const clean = Array.isArray(rawId) ? rawId[0] : rawId;

        const rawUserAgent = req.header("user-agent") || "unknown";
        const clearUserAgent = Array.isArray(rawUserAgent) ? rawUserAgent[0] : rawUserAgent;

        prisma.auditLog 
            .create({
                data: {
                    userId: req.user?.sub ?? null,
                    action: `${req.method}:${req.route?.path ?? req.path}`,
                    entity: req.baseUrl.split("/").pop() ?? "unknown",
                    entityId: clean ?? null,
                    after: body && typeof body === "object" ? (body as Prisma.InputJsonValue) : Prisma.JsonNull,
                    ipAddress: req.ip ?? "unknown",
                    userAgent: clearUserAgent?.slice(0, 500)  ?? "unknown"
                }
            })
            .catch((err) => {
                console.error("Failed to log audit:", err);
            })
        return originJson(body);
    }

    next();
}

//kurang di schemanya lah  