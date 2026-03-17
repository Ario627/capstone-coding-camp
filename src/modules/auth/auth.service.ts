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
    
    const refreshFamily = family ?? uuidv4();
    const refreshToken = jwt.sign({sub: payload.sub, family: refreshFamily, jti: uuidv4()},
        env().JWT_REFRESH_SECRET, {
        issuer: "fingrow",
        expiresIn: env().JWT_REFRESH_EXPIRY as Exclude<SignOptions["expiresIn"], undefined>,
    });
    return { accessToken, refreshToken, refreshFamily };
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

    const passwordHash = await argon2.hash(dto.password, A2_Opts);

    const user = await prisma.user.create({
        data: {email: dto.email, passwordHash, role: "user"},
        select: {id: true, email: true, role: true, createdAt: true},
    });

    const tokens = generateTokenPair({sub: user.id, email: user.email, role: user.role});
    await storeRefreshToken(user.id, tokens.refreshToken, tokens.refreshFamily);

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            action: "REGISTER",
            entity: "User",
            entityId: user.id,
            after: {email: user.email} as object,
        },
    });

    return {user, tokens};
}

export async function loginUser(dto: LoginInput) {
    const user = await prisma.user.findUnique({
        where: {email: dto.email},
        select: {id: true, email: true, role: true, isActive: true, passwordHash: true},
    });

    if(!user) {
        await argon2.hash(dto.password, A2_Opts);
        throw new AppError(400, "Invalid email or password");
    }

    if(!user.isActive) throw new AppError(403, "Account is inactive");

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if(!valid) throw new AppError(400, "Invalid email or password");

    const tokens = generateTokenPair({sub: user.id, email: user.email, role: user.role});
    await storeRefreshToken(user.id, tokens.refreshToken, tokens.refreshFamily);

    await prisma.user.update({
        where: {id: user.id},
        data: {
            lastLoginAt: new Date(),
            loginCount: {increment: 1},
        },
    });

    return {
        user: {id: user.id, email: user.email, role: user.role},
        tokens,
    };
}

export async function refreshToken(refreshToken: string) {
    if(!refreshToken) throw new AppError(400, "Refresh token is required");

    let decoded: {sub: string; family: string; jti: string;};

    try {
        decoded = jwt.verify(refreshToken, env().JWT_REFRESH_SECRET, {issuer: "fingrow"}) as typeof decoded;
    } catch {
        throw new AppError(401, "Invalid refresh token");
    }

    const stored = await prisma.refreshToken.findFirst({
        where: {tokenHash: hashToken(refreshToken), userId: decoded.sub},
    });

    if(!stored) throw new AppError(401, "Refresh token not found");

    if(stored.isRevoked) {
        await prisma.refreshToken.updateMany({
            where: {family: decoded.family},
            data: {isRevoked: true},
        });
        throw new AppError(401, "Refresh token revoked due to suspected compromise");
    }

    if(stored.expiresAt < new Date()) {
        await prisma.refreshToken.update({where: {id: stored.id}, data: {isRevoked: true}});
        throw new AppError(401, "Refresh token has expired");
    }

    const user = await prisma.user.findUnique({
        where: {id: decoded.sub},
        select: {id: true, email: true, role: true, isActive:  true},
    });
    if(!user || !user.isActive) throw new AppError(403, "Account is inactive");

    const newTokens = generateTokenPair({sub: user.id, email: user.email, role: user.role}, decoded.family);

    await prisma.$transaction([
        prisma.refreshToken.update({where: {id: stored.id}, data: {isRevoked: true}}),
        prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(newTokens.refreshToken),
                family: decoded.family,
                expiresAt: getRefreshExpiry(),
            },
        }),
    ]);

    return newTokens;
}

export async function logoutUser(userId: string, refreshToken?: string): Promise<void> {
    if(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, env().JWT_REFRESH_SECRET, {issuer: "fingrow"}) as {family: string;};

            await prisma.refreshToken.updateMany({
                where: {family: decoded.family},
                data: {isRevoked: true},
            });
        } catch {
            await prisma.refreshToken.updateMany({
                where: {userId},
                data: {isRevoked: true},
            });
        }
    } else {
        await prisma.refreshToken.updateMany({
            where: {userId},
            data: {isRevoked: true},
        });
    }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      loginCount: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError(401, "User tidak ditemukan");
  return user;
}