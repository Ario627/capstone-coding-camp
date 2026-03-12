import type { Request, Response, NextFunction } from "express";
import {prisma} from "../../lib/prisma.js";

export async function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) return next();

    const originJson = res.json.bind(res);
    res.json = function (body: unknown) {
        prisma.auditLog
            .create({
                data: {
                userId: req.user?.sub ?? null,
                action: `${req.method}:${req.route?.path ?? req.path}`,
                entity: req.baseUrl.split("/").pop() ?? "unknown",
                entityId: req.params?.id ?? null,
                after: body && typeof body === "object" ? (body as object) : undefined,
                ipAddress: req.ip ?? "unknown",
                userAgent: req.headers["user-agent"]?.slice(0, 500) ?? "unknown",
                },
            })
            .catch(() => {
                // Ga tau
            });

        return originJson(body);
    }
}

//kurang di schemanya lah  