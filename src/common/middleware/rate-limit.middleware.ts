import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedis } from "../../lib/redis.js";

function createRedisSendCommand() {
  return async (...args: string[]) => {
    return getRedis().call(...(args as [string, ...string[]])) as Promise<number>;
  };
}
//Catatan: Code di atas memakai AI karena errro yang tidak ketemu ketemu

//Global
export function generalRateLimit() {
    return rateLimit({
        windowMs: 60_000, // 1 minute
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
            sendCommand: createRedisSendCommand(), prefix: 'rl:gen:'
        }),
        message: {success: false, message: 'Too many requests, please try again later.'}
    })
}

//Login
export function loginRateLimit() {
    return rateLimit({
        windowMs: 900_000, 
        max: 5, 
        standardHeaders: true, 
        legacyHeaders: false,
        store: new RedisStore({
            sendCommand: createRedisSendCommand(), prefix: 'rl:login:'
        }),
        message: {success: false, message: 'Too many login attempts, please try again later.'}
    })
}

//Registration
export function registrationRateLimit() {
    return rateLimit({
        windowMs: 900_000, 
        max: 5, 
        standardHeaders: true, 
        legacyHeaders: false,
        store: new RedisStore({
            sendCommand: createRedisSendCommand(), prefix: 'rl:reg:'
        }),
        message: {success: false, message: 'Too many registration attempts, please try again later.'}
    })
}   

//Oauth
export function oauthRateLimit() {
    return rateLimit({
        windowMs: 900_000, 
        max: 10, 
        standardHeaders: true, 
        legacyHeaders: false,
        store: new RedisStore({
            sendCommand: createRedisSendCommand(), prefix: 'rl:oauth:'
        }),
        message: {success: false, message: 'Too many attempts, please try again later.'}
    })
}