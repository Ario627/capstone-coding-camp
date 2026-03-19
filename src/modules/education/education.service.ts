import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { generateWithFallback, estimateToken } from "../ai/ai.provider.js";
import { EDUCATION_SYSTEM_PROMPT, EDUCATION_CHAT_DEFAULTS, USER_DISPLAY_LABELS } from './education.constant.js';
import type { UserDisplayType } from './education.constant.js';
import type { EducationChatOutput, EducationContext } from "../ai/ai.types.js";
import type {
    UserContext,
    TerminologyOutput,
    EducationChatInput,
    ModuleReadOutput,
    DailyTipOutput,
    LearningModuleDetailOutput,
    LearningModuleOutput
} from './education.types.js';
import { getUserDisplayType } from './education.types.js';
import { exactOptional } from "zod";

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


function formatUserContextForPrompt(userContext: UserContext): string {
  const displayType = getUserDisplayType(userContext.userType, userContext.hasBusiness);
  const displayLabel = USER_DISPLAY_LABELS[displayType];
  
  const balanceLabel = userContext.balanceSummary.balance >= 0 ? 'Surplus' : 'Defisit';
  const balanceSign = userContext.balanceSummary.balance >= 0 ? '' : '';

  const formatted = userContext.recentTransactions.length > 0 ? userContext.recentTransactions.map((t) => {
    const sign = t.type === 'income' ? '+' : '-';
    const amount = `${sign}${t.amount.toLocaleString('id-ID')}`;
    return `  - ${amount} | ${t.category} | ${t.description}`;
  }).join('\n') : '  (Tidak ada transaksi dalam 3 bulan terakhir)';

   return `## USER PROFILE
- Tipe Pengguna: ${displayLabel}
- Ringkasan Saldo (${userContext.balanceSummary.period}):
  - Total Pemasukan: Rp ${userContext.balanceSummary.totalIncome.toLocaleString('id-ID')}
  - Total Pengeluaran: Rp ${userContext.balanceSummary.totalExpense.toLocaleString('id-ID')}
  - ${balanceLabel}: ${balanceSign}Rp ${Math.abs(userContext.balanceSummary.balance).toLocaleString('id-ID')}
  - Rasio Tabungan: ${userContext.balanceSummary.savingsRate.toFixed(1)}%
- Status Bisnis: ${userContext.hasBusiness ? 'Memiliki usaha UMKM' : 'Tidak memiliki usaha'}
- Transaksi Terakhir (10 terbaru):
${formatted}`;
}

function buildSystemPrompt(userContext: UserContext): string {
  const formattedContext = formatUserContextForPrompt(userContext);
  return EDUCATION_SYSTEM_PROMPT.replace('{{USER_CONTEXT}}', formattedContext);
}

export async function educationChat(userId: string, input: {message: string; context?: EducationContext;}): Promise<EducationChatOutput> {
  if(input.message.length > EDUCATION_CHAT_DEFAULTS.MAX_MESSAGE_LENGTH) {
    throw new AppError(400, `Message too long (max ${EDUCATION_CHAT_DEFAULTS.MAX_MESSAGE_LENGTH} characters)`);
  }

  const userContext = await buildUserContext(userId);
  const systemPrompt = buildSystemPrompt(userContext);

  const result = await generateWithFallback({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input.message },
    ],
    temperature: EDUCATION_CHAT_DEFAULTS.TEMPERATURE,
    maxOutputTokens: EDUCATION_CHAT_DEFAULTS.MAX_OUTPUT_TOKENS,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'AI_EDUCATION_CHAT',
      entity: 'AI',
      entityId: null,
      after: {
        ctx: input.context ?? 'general',
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        provider: result.provider,
      } as object,
    },
  });

  return {
    reply: result.text,
    conversationId: `edu_${Date.now()}_${userId.slice(0, 8)}`, // Generate conversation ID
    context: input.context ?? 'general',
    tokens: {
      input: result.inputTokens,
      output: result.outputTokens,
      total: result.inputTokens + result.outputTokens,
    },
    provider: result.provider,
    cached:  false,
  };
}


export async function getDailyTip(
  userId: string,
  input?: { category?: string }
): Promise<DailyTipOutput | null> {
  const whereC: Record<string, unknown> = {isActive: true};
  if(input?.category) {
    whereC.category = input.category;
  }

  const tip = await prisma.$queryRaw<Array<{ id: string; title: string; content: string; category: string }>>`
    SELECT id, title, content, category 
    FROM daily_tips 
    WHERE is_active = true 
    ${input?.category ? prisma.$queryRaw`AND category = ${input.category}` : prisma.$queryRaw``}
    ORDER BY RANDOM() 
    LIMIT 1
  `;

  if (!tip || tip.length === 0) {
    return null;
  }

  const selectedTip = tip[0];
  if (!selectedTip) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingRead = await prisma.userDailyTip.findUnique({
    where: {
      userId_tipId: {
        userId,
        tipId: selectedTip.id,
      },
    },
  });

  return {
    id: selectedTip.id,
    title: selectedTip.title,
    content: selectedTip.content,
    category: selectedTip.category,
    isRead: !!existingRead,
    readAt: existingRead?.readAt ?? null,
  };
}

export async function markDailyTipRead(userId: string, tipId: string): Promise<{ success: boolean }> {
  const tip = await prisma.dailyTip.findUnique({ where: { id: tipId } });

  if(!tip) throw new AppError(404, "Daily tip not found");

  await prisma.userDailyTip.upsert({
    where: {
      userId_tipId: {
        userId,
        tipId,
      },
    },
    update: {
      isRead: true,
      readAt: new Date(),
    },

    create: {
      userId,
      tipId,
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true };
}

export async function listLearningModules(
  input: {
    category?: string;
    difficulty?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ modules: LearningModuleOutput[]; total: number; page: number; limit: number }> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = { isActive: true };
  if (input.category) {
    whereClause.category = input.category;
  }
  if (input.difficulty) {
    whereClause.difficulty = input.difficulty;
  }

  const [modules, total] = await Promise.all([
    prisma.learningModule.findMany({
      where: whereClause,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        difficulty: true,
        duration: true,
        videoUrl: true,
        thumbnailUrl: true,
        order: true,
      },
    }),
    prisma.learningModule.count({ where: whereClause }),
  ]);

  return {
    modules: modules.map((m) => ({
      ...m,
      isRead: false,
      readAt: null,
    })),
    total,
    page,
    limit,
  };
}

export async function getLearningModule(
  userId: string,
  moduleId: string
): Promise<LearningModuleDetailOutput> {

  const modules = await prisma.learningModule.findUnique({
    where: { id: moduleId },
  });
  
  if(!modules) throw new AppError(404, "Learning module not found");

  const userRead = await prisma.userModuleRead.findUnique({
    where: {
      userId_moduleId: {
        userId,
        moduleId,
      },
    },
  });

  return {
    id: modules.id,
    title: modules.title,
    slug: modules.slug,
    description: modules.description,
    category: modules.category,
    difficulty: modules.difficulty,
    duration: modules.duration,
    videoUrl: modules.videoUrl,
    thumbnailUrl: modules.thumbnailUrl,
    order: modules.order,
    content: modules.content,
    isRead: !!userRead,
    readAt: userRead?.readAt ?? null,
  };
}

async function updateUserStreak(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.userStreak.findUnique({
    where: { userId },
  });

  if(!streak) {
    await prisma.userStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastReadAt: today,
      },
    });
    return;
  }
  const lastRead = streak.lastReadAt ? new Date(streak.lastReadAt) : null;
  if (lastRead) {
    lastRead.setHours(0, 0, 0, 0);
  }

  const dayDiff = lastRead
    ? Math.floor((today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if(dayDiff === 0) return;

  if (dayDiff === 1) {
    const newStreak = streak.currentStreak + 1;
    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(streak.longestStreak, newStreak),
        lastReadAt: today,
      },
    });
  } else {
    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: 1,
        lastReadAt: today,
      },
    });
  }
}

export async function markModuleRead(userId: string, moduleId: string): Promise<ModuleReadOutput> {
  const modules = await prisma.learningModule.findUnique({
    where: { id: moduleId },
  });
  
  if(!modules) throw new AppError(404, "Learning module not found");

  const readRecord = await prisma.userModuleRead.upsert({
    where: {
      userId_moduleId: {
        userId,
        moduleId,
      },
    },
    update: {
      isRead: true,
      readAt: new Date(),
    }, 
    create: {
      userId,
      moduleId,
      isRead: true,
      readAt: new Date(),
    },
  });

  await updateUserStreak(userId);

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'MODULE_READ',
      entity: 'LearningModule',
      entityId: moduleId,
      after: { moduleId, moduleTitle: modules.title } as object,
    },
  });

  return {
    success: true,
    moduleId,
    readAt: readRecord.readAt!, 
  };
}

export async function listTerminologies(
  input: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ terms: TerminologyOutput[]; total: number; page: number; limit: number }> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {};
  if (input.category) {
    whereClause.category = input.category;
  }
  if (input.search) {
    whereClause.OR = [
      { term: { contains: input.search, mode: 'insensitive' } },
      { definition: { contains: input.search, mode: 'insensitive' } },
    ];
  }

  const [terms, total] = await Promise.all([
    prisma.terminology.findMany({
      where: whereClause,
      orderBy: { term: 'asc' },
      skip,
      take: limit,
    }),
    prisma.terminology.count({ where: whereClause }),
  ]);

  return {
    terms: terms.map((t) => ({
      id: t.id,
      term: t.term,
      slug: t.slug,
      definition: t.definition,
      category: t.category,
      examples: t.examples as Array<{ title: string; description: string }> | null,
      relatedTerms: t.relatedTerms,
    })),
    total,
    page,
    limit,
  };
}

export async function getTerminologyBySlug(slug: string): Promise<TerminologyOutput | null> {
  const term = await prisma.terminology.findUnique({
    where: { slug },
  });

  if (!term) {
    return null;
  }

  return {
    id: term.id,
    term: term.term,
    slug: term.slug,
    definition: term.definition,
    category: term.category,
    examples: term.examples as Array<{ title: string; description: string }> | null,
    relatedTerms: term.relatedTerms,
  };
}