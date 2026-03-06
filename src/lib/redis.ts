import {Redis} from "ioredis";
import { pino } from "pino";
import  {env} from "../config/env.config.js";

const logger = pino({name: 'redis'});
let redis: Redis | undefined;

export  function getRedis(): Redis {
    if(!redis) {
        redis =  new Redis(env().REDIS_URL, {maxRetriesPerRequest: 3, retryStrategy: (t: number) => Math.min(t * 200, 3000)});

        redis.on('connect', () => logger.info('Connected to Redis'));
        redis.on('error', (err) => logger.error({err}, 'Redis error'));
        redis.on('reconnecting', (delay: number) => logger.warn({delay}, 'Reconnecting to Redis'));
    }
    return redis;
}

export  async function disconnectRedis(): Promise<void> {
    if(redis) {
        await redis.quit();
        redis = undefined;
        logger.info('Disconnected from Redis');
    }
}