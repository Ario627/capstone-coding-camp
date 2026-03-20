import type { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler.middleware.js";
import { checkQuota } from "../../modules/ai/ai-consultant-quota.service.js";
import { CONSULTANT_ERROR_MESSAGES } from "../../modules/ai/ai.constant.js";

export async function quotaMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
    if(!req.user) throw new AppError(401, 'Unauthorized');

    const quota = await checkQuota(req.user.sub);

    if(!quota.allowed) {
        const message = quota.reason === 'daily_exhausted'
            ? CONSULTANT_ERROR_MESSAGES.QUOTA_EXHAUSTED_DAILY
            : CONSULTANT_ERROR_MESSAGES.QUOTA_EXHAUSTED_MONTHLY;
        throw new AppError(403, message, {
          code:
            quota.reason === "daily_exhausted"
              ? "QUOTA_EXHAUSTED_DAILY"
              : "QUOTA_EXHAUSTED_MONTHLY",
            remaining: quota.remaining,
        });
    }

    req.validated = {
        ...req.validated,
        quota,
    }
    next();
}