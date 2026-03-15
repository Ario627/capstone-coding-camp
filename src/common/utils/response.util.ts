import type { Response } from "express";

export function sendSuccess(res: Response, data: unknown, statusCode = 200): void {
    res.status(statusCode).json({success: true, data, timestamp: new Date().toISOString()})
}

export function sendCreated(res: Response, data: unknown): void {
    sendSuccess(res, data, 201);
}