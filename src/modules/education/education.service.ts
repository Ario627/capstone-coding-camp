import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { generateWithFallback, estimateToken } from "../ai/ai.provider.js";
import { EDUCATION_SYSTEM_PROMPT, EDUCATION_CHAT_DEFAULTS, USER_DISPLAY_LABELS } from './education.constant.js';
import type { UserDisplayType } from './education.constant.js';
import type { EducationContext } from "../ai/ai.types.js";
import type {
    UserContext,
    TerminologyOutput,
    EducationChatInput,
    ModuleReadOutput,
    DailyTipOutput,
    LearningModuleDetailOutput,
    LearningModuleOutput
} from './education.types.js';
import type { getUserDisplayType } from './education.types.js';

async function buildUserContext(userId: string): Promise<UserContext> {
    const [user, businessCount, threeMonthsAgo] = await Promise.all([
        prisma.user.findUnique({
            where: {id: userId},
            select: {role: true},
        }),
        prisma.business.count({where: {userId, deletedAt: null}}),
        Promise.resolve((() => {
            const date = new Date();
            date.setMonth(date.getMonth() - 3);
            return date;
        })()),
    ]);

    if(!user) throw new AppError(404, "User not found");

    const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: threeMonthsAgo },
    },
    select: {
      amount: true,
      type: true,
    },
  });

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  const recentTransactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      amount: true,
      type: true,
      category: true,
      description: true,
      createdAt: true,
    },
  });

  return {
    userType: user.role,
    hasBusiness: businessCount > 0,
    balanceSummary: {
      totalIncome,
      totalExpense,
      balance,
      savingsRate: Math.round(savingsRate * 100) / 100,
      period: '3 bulan terakhir',
    },
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description,
      createdAt: t.createdAt,
    })),
  };
}


