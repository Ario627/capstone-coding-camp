import type { Request, Response, NextFunction } from "express";
import {z} from 'zod';

export function validate(schemas: {
    body?: z.ZodTypeAny,
    query?: z.ZodTypeAny,
    params?: z.ZodTypeAny,
}) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        req.validated = req.validated ?? {};
        if (schemas.body) {
            req.body = schemas.body.parse(req.body);
            req.validated.body = req.body;
        }
        if (schemas.query) {
            // Express v5: req.query is getter-only; don't assign to it.
            req.validated.query = schemas.query.parse(req.query) as Record<string, any>;
        }
        if (schemas.params) {
            req.params = schemas.params.parse(req.params) as Record<string, string>;
            req.validated.params = req.params as unknown as Record<string, string | string[]>;
        }
        next();
    }
}