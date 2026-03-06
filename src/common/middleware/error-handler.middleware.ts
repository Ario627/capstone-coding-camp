import type {Request, Response, NextFunction} from 'express';
import { pino } from 'pino';
import { ZodError, success, z } from 'zod';

const logger = pino({name:  'error-handler'});

export class AppError extends Error {
    constructor(
        public readonly statusCode:  number,
        message: string,
        public readonly  errors?: Record<string, any> 
    ) {
        super(message)
        this.name = 'AppError';
    }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {

    // Zod validation errors
    if (err instanceof ZodError) {
        const {fieldErrors} = z.flattenError(err);
        res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: z.flattenError(err).fieldErrors,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
        });
        return;
    }

    //Known application errors
    if(err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.errors ? {errors: err.errors} : {} ),
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
        });
        return;
    }

    //Unknown errors
    logger.error({err, url:  req.originalUrl, method: req.method}, 'Unhandled error occurred');
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    });
}