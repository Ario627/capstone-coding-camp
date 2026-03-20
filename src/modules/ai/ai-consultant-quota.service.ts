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

export async function incrementUsage(userId: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.aIQuota.findUnique({ where: { userId } });

  if (!existing) {
    await getOrCreateQuota(userId);
  }

  await prisma.aIQuota.update({
    where: { userId },
    data: {
      usedToday: { increment: 1 },
      usedThisMonth: { increment: 1 },
    },
  });

  // Log to AIUsage
  await prisma.aIUsage.create({
    data: {
      userId,
      endpoint: "consultant_chat",
      model: "unknown", // Will be updated by service
      inputTokens: 0, // Will be updated by service
      outputTokens: 0,
      cost: 0,
      cached: false,
    },
  });
}

function calculateCost(
  provider: "groq" | "gemini",
  inputTokens: number,
  outputTokens: number,
): number {
  const COST_PER_1K = {
    groq: { input: 0.00001, output: 0.00001 },
    gemini_flash: { input: 0.000075, output: 0.0003 },
  };

  const rates =
    provider === "groq" ? COST_PER_1K.groq : COST_PER_1K.gemini_flash;

  const inputCost = (inputTokens / 1000) * rates.input;
  const outputCost = (outputTokens / 1000) * rates.output;

  return Number((inputCost + outputCost).toFixed(6));
}

export async function logUsage(
  userId: string,
  data: {
    model: string;
    provider: "groq" | "gemini";
    inputTokens: number;
    outputTokens: number;
    conversationId?: string;
    hasFile?: boolean;
  },
): Promise<void> {
  //calcualte
  const cost = calculateCost(
    data.provider,
    data.inputTokens,
    data.outputTokens,
  );

  // Update last usage log
  const lastUsage = await prisma.aIUsage.findFirst({
    where: { userId, endpoint: "consultant_chat" },
    orderBy: { createdAt: "desc" },
  });

  if (lastUsage) {
    await prisma.aIUsage.update({
      where: { id: lastUsage.id },
      data: {
        model: data.model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cost,
        metadata: {
          conversationId: data.conversationId,
          hasFile: data.hasFile,
        },
      },
    });
  }
}

export async function adjustQuota(
  userId: string,
  limits: { dailyLimit?: number; monthlyLimit?: number },
): Promise<QuotaStatus> {
  const updateData: { dailyLimit?: number; monthlyLimit?: number } = {};

  if (limits.dailyLimit !== undefined) {
    const daily = Math.max(
      CONSULTANT_QUOTA_LIMITS.DAILY_MIN,
      Math.min(limits.dailyLimit, CONSULTANT_QUOTA_LIMITS.DAILY_MAX),
    );
    updateData.dailyLimit = daily;
  }

  if (limits.monthlyLimit !== undefined) {
    const monthly = Math.max(
      CONSULTANT_QUOTA_LIMITS.MONTHLY_MIN,
      Math.min(limits.monthlyLimit, CONSULTANT_QUOTA_LIMITS.MONTHLY_MAX),
    );
    updateData.monthlyLimit = monthly;
  }

  if (Object.keys(updateData).length === 0) {
    return getOrCreateQuota(userId);
  }

  await prisma.aIQuota.update({
    where: { userId },
    data: updateData,
  });

  return getOrCreateQuota(userId);
}

// Get usage stats user
export async function getUsageStats(userId: string, days: number = 30): Promise<{
  total: { requests: number; inputTokens: number; outputTokens: number; cost: number };
  byDay: Array<{ date: string; requests: number; tokens: number }>;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const usages = await prisma.aIUsage.findMany({
    where: { userId, endpoint: 'consultant_chat', createdAt: { gte: since } },
    select: { createdAt: true, inputTokens: true, outputTokens: true, cost: true },
    orderBy: { createdAt: 'asc' },
  });
  
  const total = {
    requests: usages.length,
    inputTokens: usages.reduce((sum, u) => sum + u.inputTokens, 0),
    outputTokens: usages.reduce((sum, u) => sum + u.outputTokens, 0),
    cost: usages.reduce((sum, u) => sum + Number(u.cost), 0),
  };
  
  // Group by day
  const byDayMap = new Map<string, { requests: number; tokens: number }>();
  for (const u of usages) {
    const date = u.createdAt.toISOString().split('T')[0]!;
    const existing = byDayMap.get(date) || { requests: 0, tokens: 0 };
    existing.requests++;
    existing.tokens += u.inputTokens + u.outputTokens;
    byDayMap.set(date, existing);
  }
  
  const byDay = Array.from(byDayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return { total, byDay };
}