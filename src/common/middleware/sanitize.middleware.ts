import  type {Request, Response, NextFunction} from 'express';


export function sanitize(req: Request, _res: Response, next: NextFunction): void {

    if(req.body && typeof req.body === 'object') {
        req.body = sanitizeDeep(req.body as Record<string, unknown>);
    }
}

function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

function sanitizeDeep(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for(const [key, value] of Object.entries(obj)) {
        if(typeof value === 'string') {
            result[key] = stripTags(value);
        } else if(Array.isArray(value)) {
            result[key] = value.map((item) => typeof item === 'string' 
                ? stripTags(item)
                : typeof item === 'object' && item !== null
                    ? sanitizeDeep(item as Record<string, unknown>)
                    : item
            );
        } else if(typeof value === 'object' && value !== null) {
            result[key] = sanitizeDeep(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }
    return result;
}