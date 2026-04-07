import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { verifyPassword, hahsPassword } from "../auth/auth.service.js";
import type { ProfileData, UpdateProfileResult } from "./profile.types.js";
import type { Prisma } from "@prisma/client";

interface UpdateProfileData {
  fullName?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function getProfile(userId: string): Promise<ProfileData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User tidak ditemukan");
  }

  return user;
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileData,
): Promise<UpdateProfileResult> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
      role: true,
    },
  });

  if (!currentUser) {
    throw new AppError(404, "User tidak ditemukan");
  }

  if (!currentUser.isActive) {
    throw new AppError(403, "Akun tidak aktif");
  }

  if (data.email && data.email !== currentUser.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new AppError(409, "Email sudah digunakan akun lain");
    }
  }

  const updateData: { fullName?: string; email?: string } = {};
  const beforeData: Record<string, unknown> = {};
  const afterData: Record<string, unknown> = {};

  if (data.fullName !== undefined && data.fullName !== currentUser.fullName) {
    updateData.fullName = data.fullName;
    beforeData.fullName = currentUser.fullName;
    afterData.fullName = data.fullName;
  }

  if (data.email !== undefined && data.email !== currentUser.email) {
    updateData.email = data.email;
    beforeData.email = currentUser.email;
    afterData.email = data.email;
  }

  if (Object.keys(updateData).length === 0) {
    return {
      id: userId,
      email: currentUser.email,
      fullName: currentUser.fullName,
      role: currentUser.role,
      updatedAt: new Date(),
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        updatedAt: true,
      },
    });

    if (Object.keys(afterData).length > 0) {
      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE_PROFILE",
          entity: "User",
          entityId: userId,
          before: beforeData as Prisma.InputJsonValue,
          after: afterData as Prisma.InputJsonValue,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
        },
      });
    }

    return updated;
  });

  return result;
}

interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function changePassword(
  userId: string,
  data: ChangePasswordData,
): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, isActive: true },
  });

  if (!user) {
    throw new AppError(404, "User tidak ditemukan");
  }

  if (!user.isActive) {
    throw new AppError(403, "Akun tidak aktif");
  }

  const isValidPassword = await verifyPassword(
    user.passwordHash,
    data.oldPassword,
  );
  if (!isValidPassword) {
    throw new AppError(400, "Password lama tidak valid");
  }

  const newPasswordHash = await hahsPassword(data.newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "CHANGE_PASSWORD",
        entity: "User",
        entityId: userId,
        before: {},
        after: {},
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  });

  return {
    success: true,
    message: "Password berhasil diubah",
  };
}