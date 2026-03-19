import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default("api/v1"),
  FRONTEND_URL: z.url().optional().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(10),
  DIRECT_DATABASE_URL: z.string().min(10).optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  REDIS_URL: z.string().min(5).optional(),
  CSRF_SECRET: z.string().min(16).optional().default("dev-csrf-secret-change-me"),
  TFL_HASH_SECRET: z.string().min(32).optional().default("dev-tfl-hash-secret-at-least-32-characters-long"),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16).optional().default("dev-webhook-secret-change"),
  PAYMENT_ENCRYPTION_KEY: z.string().min(32).optional().default("dev-encryption-key-at-least-32-characters"),
  
  // AI nya 
  GROQ_API_KEY: z.string().min(10).optional(),
  GEMINI_API_KEY: z.string().min(10).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _env: EnvConfig;

export function validateEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid env:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  _env = parsed.data;
  return _env;
}

export function env(): EnvConfig {
  if (!_env) {
    throw new Error('env() called before validateEnv()');
  }
  return _env;
}