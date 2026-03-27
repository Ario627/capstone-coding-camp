import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedis } from "../../lib/redis.js";
import { CONSULTANT_RATE_LIMITS } from "../../modules/ai/ai-consultant.constant.js";
import { UMKM_RATE_LIMITS, WALLET_RATE_LIMITS } from "../constants/index.js";

function useRedisStore(): boolean {
  const flag = process.env.DISABLE_REDIS;
  if (flag && flag.toLowerCase() === "true") return false;
  return Boolean(process.env.REDIS_URL);
}

function createRedisSendCommand() {
  return async (...args: string[]) => {
    return getRedis().call(
      ...(args as [string, ...string[]]),
    ) as Promise<number>;
  };
}
//Catatan: Code di atas memakai AI karena errro yang tidak ketemu ketemu

// Global rate limit
export function generalRateLimit() {
  return rateLimit({
    windowMs: 60_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:gen:",
          }),
        }
      : {}),
    message: {
      success: false,
      message: "Too many requests, please try again later.",
    },
  });
}

// Login rate limit
export function loginRateLimit() {
  return rateLimit({
    windowMs: 900_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:login:",
          }),
        }
      : {}),
    message: {
      success: false,
      message: "Too many login attempts, please try again later.",
    },
  });
}

// Registration rate limit
export function registrationRateLimit() {
  return rateLimit({
    windowMs: 900_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:reg:",
          }),
        }
      : {}),
    message: {
      success: false,
      message: "Too many registration attempts, please try again later.",
    },
  });
}

// OAuth rate limit
export function oauthRateLimit() {
  return rateLimit({
    windowMs: 900_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:oauth:",
          }),
        }
      : {}),
    message: {
      success: false,
      message: "Too many attempts, please try again later.",
    },
  });
}

// Payment rate limit
export function paymentRateLimit() {
  return rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:payment:",
          }),
        }
      : {}),
    message: {
      success: false,
      message: "Too many payment attempts, please try again later.",
    },
  });
}

// Webhook rate limit
export function webhookRateLimit() {
  return rateLimit({
    windowMs: 60_000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:whk:",
          }),
        }
      : {}),
    message: {
      success: false,
      message: "Too many webhook requests, please try again later.",
    },
  });
}

// AI rate limit (per user) - untuk ai.routes.ts
export function aiRateLimit() {
  return rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.sub || (req.ip ? ipKeyGenerator(req.ip) : "anonymous");
    },
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:ai:",
          }),
        }
      : {}),
    message: {
      success: false,
      message:
        "Terlalu banyak permintaan ke AI. Silakan coba lagi dalam beberapa menit.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });
}

// AI Consultant rate limit (per user) - untuk consultant.routes.ts
export function consultantRateLimit() {
  return rateLimit({
    windowMs: 60_000,
    max: CONSULTANT_RATE_LIMITS.PER_MINUTE,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.sub || (req.ip ? ipKeyGenerator(req.ip) : "anonymous");
    },
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:consultant:",
          }),
        }
      : {}),
    message: {
      success: false,
      message:
        "Terlalu banyak permintaan ke AI Consultant. Silakan coba lagi dalam beberapa menit.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });
}

//Versi Bisnis nya
export function umkmRateLimit() {
  return rateLimit({
    windowMs: UMKM_RATE_LIMITS.WINDOW_MS,
    max: UMKM_RATE_LIMITS.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (req.user?.sub) return `user:${req.user.sub}`;
      return req.ip ? ipKeyGenerator(req.ip) : "anonymous";
    },
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:umkm:",
          }),
        }
      : {}),
    message: {
      success: false,
      message:
        "Terlalu banyak permintaan ke UMKM API. Silakan coba lagi dalam beberapa menit.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });
}

export function umkmWriteRateLimit() {
  return rateLimit({
    windowMs: 60_000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (req.user?.sub) return `user:${req.user.sub}`;
      return req.ip ? ipKeyGenerator(req.ip) : "anonymous";
    },
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:umkm:w:",
          }),
        }
      : {}),
    message: {
      success: false,
      message:
        "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });
}

export function walletReadRateLimit() {
  return rateLimit({
    windowMs: WALLET_RATE_LIMITS.READ_WINDOW_MS,
    max: WALLET_RATE_LIMITS.READ_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserKey,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:wallet:r:",
          }),
        }
      : {}),
    message: {
      success: false,
      message:
        "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });
}

function getUserKey(req: {
  user?: { sub?: string };
  ip?: string | undefined;
}): string {
  if (req.user?.sub) return `user:${req.user.sub}`;
  return req.ip ? ipKeyGenerator(req.ip) : "anonymous";
}

export function walletWriteRateLimit() {
  return rateLimit({
    windowMs: WALLET_RATE_LIMITS.WRITE_WINDOW_MS,
    max: WALLET_RATE_LIMITS.WRITE_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserKey,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:wallet:w:",
          }),
        }
      : {}),
    message: {
      success: false,
      message:
        "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });
}

export function walletTransferRateLimit() {
  return rateLimit({
    windowMs: WALLET_RATE_LIMITS.TRANSFER_WINDOW_MS,
    max: WALLET_RATE_LIMITS.TRANSFER_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserKey,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:wallet:transfer:",
          }),
        }
      : {}),
    message: {
      success: false,
      message:
        "Terlalu banyak transfer. Silakan coba lagi dalam beberapa menit.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  });
}

export function walletCallbackRateLimit() {
  return rateLimit({
    windowMs: WALLET_RATE_LIMITS.CALLBACK_WINDOW_MS,
    max: WALLET_RATE_LIMITS.CALLBACK_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    ...(useRedisStore()
      ? {
          store: new RedisStore({
            sendCommand: createRedisSendCommand(),
            prefix: "rl:wallet:cb:",
          }),
        }
      : {}),
    message: { success: false, message: "Too many requests." },
  });
}