import type { QuotaCheck } from "../modules/ai/ai.types.js";

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    iat: number;
    exp: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            validated?: {
                body?: unknown;
                query?: Record<string, any>;
                params?: Record<string, string | string[]>;
                quota?: QuotaCheck;
            };
        }
    }
}

export {}
