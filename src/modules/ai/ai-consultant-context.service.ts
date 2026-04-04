import { prisma } from "../../lib/prisma.js";
import { CONSULTANT_CONTEXT_CONFIG } from "./ai-consultant.constant.js";
import type { UserFinancialContext } from "./ai-consultant.types.js";

// Helper: Get date N months ago
function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Build complete user financial context
export async function buildUserFinancialContext(userId: string): Promise<UserFinancialContext> {
  const startDate = monthsAgo(CONSULTANT_CONTEXT_CONFIG.TRANSACTION_MONTHS);
  
  // Run all queries in parallel
  const [
    user,
    business,
    streak,
    stats,
    moduleProgress,
  ] = await Promise.all([
    getUserProfile(userId),
    getBusinessData(userId),
    getUserStreak(userId),
    getTransactionStats(userId, startDate),
    getEducationProgress(userId),
  ]);
  
  return {
    profile: {
      userType: user.role === 'admin' ? 'admin' : (business ? 'umkm' : 'personal'),
      joinedAt: user.createdAt,
      hasBusiness: !!business,
      streakDays: streak?.currentStreak ?? 0,
    },
    financialSummary: stats.summary,
    categoryBreakdown: stats.categories,
    monthlyTrend: stats.monthlyTrend,
    recentTransactions: stats.recent,
    ...(stats.payment ? { paymentSummary: stats.payment } : {}),
    ...(business ? {
      businessData: {
        name: business.name,
        type: business.type,
        inventoryCount: business.inventoryCount ?? 0,
        inventoryValue: business.inventoryValue ?? 0,
      },
    } : {}),
    educationProgress: moduleProgress,
  };
}

// Get user profile
async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, createdAt: true },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

// Get business data if exists
async function getBusinessData(userId: string) {
  const business = await prisma.business.findFirst({
    where: { userId, deletedAt: null, isActive: true },
    select: { name: true, type: true },
  });
  
  if (!business) return null;
  
  // Get inventory summary
  const inventory = await prisma.inventoryItem.aggregate({
    where: { userId, deletedAt: null },
    _count: { id: true },
    _sum: { unitPrice: true },
  });
  
  return {
    ...business,
    inventoryCount: inventory._count.id,
    inventoryValue: Number(inventory._sum.unitPrice ?? 0),
  };
}

// Get user streak
async function getUserStreak(userId: string) {
  return prisma.userStreak.findUnique({
    where: { userId },
    select: { currentStreak: true },
  });
}

// Get education progress
async function getEducationProgress(userId: string) {
  const [completed, total, lastRead] = await Promise.all([
    prisma.userModuleRead.count({
      where: { userId, isRead: true },
    }),
    prisma.learningModule.count({ where: { isActive: true } }),
    prisma.userModuleRead.findFirst({
      where: { userId },
      orderBy: { readAt: 'desc' },
      select: { readAt: true },
    }),
  ]);
  
  return {
    modulesCompleted: completed,
    totalModules: total,
    lastActivity: lastRead?.readAt ?? null,
  };
}

// Get transaction stats (main query)
async function getTransactionStats(userId: string, startDate: Date) {
  // Get all transactions in period
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: startDate },
    },
    select: {
      amount: true,
      type: true,
      category: true,
      description: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  
  // Get recent transactions (limited)
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: CONSULTANT_CONTEXT_CONFIG.RECENT_TRANSACTIONS_LIMIT,
    select: {
      amount: true,
      type: true,
      category: true,
      description: true,
      createdAt: true,
    },
  });
  
  // Get payment summary
  const payments = await prisma.paymentTransaction.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    select: { amount: true, method: true, status: true },
  });
  
  // Calculate summary
  let totalIncome = 0;
  let totalExpense = 0;
  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  const monthlyData: Record<string, { income: number; expense: number }> = {};
  
  for (const tx of transactions) {
    const monthKey = tx.createdAt.toISOString().slice(0, 7); // YYYY-MM
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      incomeByCategory[tx.category] = (incomeByCategory[tx.category] ?? 0) + tx.amount;
      monthlyData[monthKey].income += tx.amount;
    } else {
      totalExpense += tx.amount;
      expenseByCategory[tx.category] = (expenseByCategory[tx.category] ?? 0) + tx.amount;
      monthlyData[monthKey].expense += tx.amount;
    }
  }
  
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
  
  // Format category breakdown
  const incomeCategories = Object.entries(incomeByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      count: transactions.filter(t => t.type === 'income' && t.category === category).length,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, CONSULTANT_CONTEXT_CONFIG.TOP_CATEGORIES_LIMIT);
  
  const expenseCategories = Object.entries(expenseByCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      count: transactions.filter(t => t.type === 'expense' && t.category === category).length,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, CONSULTANT_CONTEXT_CONFIG.TOP_CATEGORIES_LIMIT);
  
  // Format monthly trend
  const monthlyTrend = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }));
  
  // Payment summary
  const completedPayments = payments.filter(p => p.status === 'COMPLETED');
  const totalPaymentAmount = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const methodCounts: Record<string, number> = {};
  for (const p of payments) {
    methodCounts[p.method] = (methodCounts[p.method] ?? 0) + 1;
  }
  const preferredMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';
  
  return {
    summary: {
      period: `${CONSULTANT_CONTEXT_CONFIG.TRANSACTION_MONTHS} bulan terakhir`,
      totalIncome,
      totalExpense,
      balance,
      savingsRate: Math.round(savingsRate * 100) / 100,
      transactionCount: transactions.length,
    },
    categories: {
      income: incomeCategories,
      expense: expenseCategories,
    },
    monthlyTrend,
    recent: recentTransactions.map(t => ({
      date: t.createdAt,
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description,
    })),
    payment: payments.length > 0 ? {
      totalPayments: payments.length,
      totalAmount: totalPaymentAmount,
      successRate: payments.length > 0 ? (completedPayments.length / payments.length) * 100 : 0,
      preferredMethod,
    } : undefined,
  };
}

// Format context for prompt injection
export function formatContextForPrompt(context: UserFinancialContext): string {
  const lines: string[] = ['## DATA KEUANGAN PENGGUNA'];
  
  // Profile
  lines.push(`**Profil:**`);
  lines.push(`- Tipe: ${context.profile.userType}`);
  lines.push(`- Bergabung: ${context.profile.joinedAt.toLocaleDateString('id-ID')}`);
  if (context.profile.hasBusiness) {
    lines.push(`- Punya usaha UMKM`);
  }
  if (context.profile.streakDays > 0) {
    lines.push(`- Streak pembelajaran: ${context.profile.streakDays} hari`);
  }
  
  // Summary
  lines.push('');
  lines.push(`**Ringkasan (${context.financialSummary.period}):**`);
  lines.push(`- Total Pemasukan: Rp${context.financialSummary.totalIncome.toLocaleString('id-ID')}`);
  lines.push(`- Total Pengeluaran: Rp${context.financialSummary.totalExpense.toLocaleString('id-ID')}`);
  lines.push(`- Saldo: Rp${context.financialSummary.balance.toLocaleString('id-ID')}`);
  lines.push(`- Rasio Tabungan: ${context.financialSummary.savingsRate.toFixed(1)}%`);
  lines.push(`- Jumlah Transaksi: ${context.financialSummary.transactionCount}`);
  
  // Category breakdown
  if (context.categoryBreakdown.expense.length > 0) {
    lines.push('');
    lines.push(`**Pengeluaran per Kategori:**`);
    for (const cat of context.categoryBreakdown.expense.slice(0, 5)) {
      lines.push(`- ${cat.category}: Rp${cat.amount.toLocaleString('id-ID')} (${cat.percentage.toFixed(1)}%)`);
    }
  }
  
  // Monthly trend (last 3 months)
  if (context.monthlyTrend.length > 0) {
    lines.push('');
    lines.push(`**Tren Bulanan (3 bulan terakhir):**`);
    for (const month of context.monthlyTrend.slice(-3)) {
      lines.push(`- ${month}: Masuk Rp${month.income.toLocaleString('id-ID')} | Keluar Rp${month.expense.toLocaleString('id-ID')} | Saldo Rp${month.balance.toLocaleString('id-ID')}`);
    }
  }
  
  // Recent transactions (last 5)
  if (context.recentTransactions.length > 0) {
    lines.push('');
    lines.push(`**Transaksi Terakhir (5 terakhir):**`);
    for (const tx of context.recentTransactions.slice(0, 5)) {
      const sign = tx.type === 'income' ? '+' : '-';
      lines.push(`- ${tx.date.toLocaleDateString('id-ID')}: ${sign}Rp${tx.amount.toLocaleString('id-ID')} (${tx.category}) - ${tx.description}`);
    }
  }
  
  // Business data
  if (context.businessData) {
    lines.push('');
    lines.push(`**Data Usaha:**`);
    lines.push(`- Nama: ${context.businessData.name}`);
    lines.push(`- Tipe: ${context.businessData.type}`);
    lines.push(`- Jumlah Inventory: ${context.businessData.inventoryCount}`);
    lines.push(`- Nilai Inventory: Rp ${context.businessData.inventoryValue.toLocaleString('id-ID')}`);
  }
  
  // Education progress
  lines.push('');
  lines.push(`**Progress Edukasi:**`);
  lines.push(`- Modul Selesai: ${context.educationProgress.modulesCompleted}/${context.educationProgress.totalModules}`);
  
  return lines.join('\n');
}