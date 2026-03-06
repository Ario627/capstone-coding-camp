import type { Request, Response, NextFunction } from "express";
import {z} from 'zod';

export function validate(schemas: {
    body?: z.ZodTypeAny,
    query?: z.ZodTypeAny,
    params?: z.ZodTypeAny,
}) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if(schemas.body) {
            req.body = schemas.body.parse(req.body);

            if(schemas.query) {
                req.query = schemas.query.parse(req.query) as Record<string, any>;
            }
            if(schemas.params) {
                req.params = schemas.params.parse(req.params) as Record<string, string>;
            }


            next();
        }
    }
}