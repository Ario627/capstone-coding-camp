import type { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler.middleware.js";

export function roleMiddleware(...role: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if(!req.user) {
            throw new AppError(401, 'Authentication required');
        }
        if(!role.includes(req.user.role)) {
            throw new AppError(403, 'Forbidden: Insufficient permissions');
        }
        next();
    }
}