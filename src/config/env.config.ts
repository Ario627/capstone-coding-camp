import {z} from 'zod';

//Hasil AI karena untuk mempercepat development
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('api/v1'),
  FRONTEND_URL: z.string().url().optional().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(10),
  DIRECT_DATABASE_URL: z.string().min(10).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_KEY: z.string().min(20).optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  REDIS_URL: z.string().min(5).optional(),
  GOOGLE_CLIENT_ID: z.string().min(10).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(10).optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  TWITTER_CLIENT_ID: z.string().min(5).optional(),
  TWITTER_CLIENT_SECRET: z.string().min(5).optional(),
  TWITTER_REDIRECT_URI: z.string().url().optional(),
  CSRF_SECRET: z.string().min(16).optional(),
  GEMINI_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16).optional(),
  TFL_HASH_SECRET: z.string().min(32).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;
let _env: EnvConfig;

export function validateEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) { console.error('Invalid env:', parsed.error.flatten().fieldErrors); process.exit(1); }
  _env = parsed.data;
  return _env;
}

export function env(): EnvConfig {
  if (!_env) throw new Error('env() called before validateEnv()');
  return _env;
}