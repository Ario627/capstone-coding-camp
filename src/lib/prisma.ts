import { PrismaClient } from "@prisma/client";
import { pino } from "pino";

const logger = pino({name: 'prismma'})

const prisma = new PrismaClient({
    log: [
        {level: 'warn', emit: 'event'},
        {level: 'error', emit: 'event'},
    ],
});

prisma.$on('warn' as never, (e: unknown) => logger.warn(e));
prisma.$on('error' as never, (e: unknown) => logger.error(e));

export async function connectPrisma(): Promise<void> {
    await prisma.$connect();
    logger.info('Prisma connected');
}

export async function disconnectPrisma(): Promise<void> {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
}

export {prisma}