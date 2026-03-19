import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { CONSULTANT_QUOTA_LIMITS } from "./ai-consultant.constant.js";
import type { QuotaCheck, QuotaStatus } from "./ai.types.js";

//Helper
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfNextDay(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function startOfNextMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOrCreateQuota(userId: string): Promise<QuotaStatus> {
  const now = new Date();
  const dailyReset = startOfNextDay(now);
  const monthlyReset = startOfNextMonth(now);

  let quota = await prisma.aIQuota.findUnique({ where: { userId } });

  if (!quota) {
    quota = await prisma.aIQuota.create({
      data: {
        userId,
        monthlyLimit: CONSULTANT_QUOTA_LIMITS.MONTHLY_DEFAULT,
        dailyLimit: CONSULTANT_QUOTA_LIMITS.DAILY_DEFAULT,
        usedThisMonth: 0,
        usedToday: 0,
        monthResetAt: monthlyReset,
        dailyResetAt: dailyReset,
      },
    });
  } else {
    const needsDailyReset = now >= quota.dailyResetAt;
    const needsMonthlyReset = now >= quota.monthResetAt;

    if (needsDailyReset || needsMonthlyReset) {
      const updateData: {
        usedToday?: number;
        dailyResetAt?: Date;
        usedThisMonth?: number;
        monthResetAt?: Date;
      } = {};

      if (needsDailyReset) {
        updateData.usedToday = 0;
        updateData.dailyResetAt = startOfNextDay(now);
      }

      if (needsMonthlyReset) {
        updateData.usedThisMonth = 0;
        updateData.monthResetAt = startOfNextMonth(now);
      }

      quota = await prisma.aIQuota.update({
        where: { userId },
        data: updateData,
      });
    }
  }

  return {
    daily: {
      limit: quota.dailyLimit,
      used: quota.usedToday,
      remaining: Math.max(0, quota.dailyLimit - quota.usedToday),
      resetAt: quota.dailyResetAt,
    },
    monthly: {
      limit: quota.monthlyLimit,
      used: quota.usedThisMonth,
      remaining: Math.max(0, quota.monthlyLimit - quota.usedThisMonth),
      resetAt: quota.monthResetAt,
    },
  };
}

export async function checkQuota(userId: string): Promise<QuotaCheck> {
  const quota = await getOrCreateQuota(userId);

  if (quota.daily.remaining <= 0) {
    return {
      allowed: false,
      reason: "daily_exhausted",
      remaining: { daily: 0, monthly: quota.monthly.remaining },
    };
  }

  if (quota.monthly.remaining <= 0) {
    return {
      allowed: false,
      reason: "monthly_exhausted",
      remaining: { daily: quota.daily.remaining, monthly: 0 },
    };
  }

  return {
    allowed: true,
    remaining: {
      daily: quota.daily.remaining,
      monthly: quota.monthly.remaining,
    },
  };
}
