import argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from "jsonwebtoken";
import type { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.config.js';
import { AppError } from '../../common/middleware/error-handler.middleware.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

//Config Argon2
const A2_Opts = {
    type: argon2.argon2id,
    memoryCost: 65536, //64  MB
    timeCost: 3,
    parallelism: 4,
}

//Saran Helper 
function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function getRefreshExpiry(): Date {
    const e = env().JWT_REFRESH_EXPIRY;
    const match = e.match(/^(\d+)([smhd])$/);
    if(!match) throw new Date(Date.now() + 7 * 86_400_000);
    const multipliers: Record<string, number> = {
        s: 1000,
        m: 60_000,
        h: 3_600_000,
        d: 86_400_000,
    }
    return new Date(Date.now() + parseInt(match[1]!) * (multipliers[match[2]!] ?? 86_400_000));
}

export function generateTokenPair(payload: {sub: string; email: string; role: string;}, family?: string) {
    const accessToken = jwt.sign(payload, env().JWT_ACCESS_SECRET, {
        issuer: "fingrow",
        audience: "fingrow-client",
        expiresIn: env().JWT_ACCESS_EXPIRY as Exclude<SignOptions["expiresIn"], undefined>,
    });
    const refreshToken = jwt.sign({ ...payload, family }, env().JWT_REFRESH_SECRET, {
        issuer: "fingrow",
        audience: "fingrow-client",
        expiresIn: env().JWT_REFRESH_EXPIRY as Exclude<SignOptions["expiresIn"], undefined>,
    });
    return { accessToken, refreshToken };
}

async function storeRefreshToken(userId: string, token: string, family: string): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      family,
      expiresAt: getRefreshExpiry(),
    },
  });
}

// Service utama
export async function registerUser(dto: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: {email: dto.email}})

    if(existing) throw new AppError(400, "Email already in use");
}