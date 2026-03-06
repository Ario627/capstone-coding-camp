import type { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { AppError } from "./error-handler.middleware.js";
import type { JwtPayload } from "../../types/express.js";
import {env} from '../../config/env.config.js'

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const h = req.headers.authorization;

    if(!h || !h.startsWith('Bearer ')) throw new AppError(401, 'Unauthorized: Missing or invalid Authorization header');

    try {
        req.user = jwt.verify(h.slice(7), env().JWT_ACCESS_SECRET, {issuer: 'fingrow', audience: 'fingrow-client'}) as JwtPayload;
        next();
    } catch (err) {
        throw new AppError(401, 'Unauthorized: Invalid token');
    }
}
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    const h = req.headers.authorization;
    if(h?.startsWith('Bearer ')) {
        try  {
            req.user = jwt.verify(h.slice(7), env().JWT_ACCESS_SECRET, {issuer: 'fingrow', audience: 'fingrow-client'}) as JwtPayload;
        } catch (err) {
            // sanfnuanujnmau
        }
        next();
    }
}