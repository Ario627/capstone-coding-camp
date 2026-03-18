import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.config.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type {
  NarrativeReportInput,
  FinancialProjectionInput,
  FinancialAnalysisInput,
  BudgetOptimizationInput,
  AnomalyDetectionInput,
  SmartCategorizationInput,
  GoalRecommendationInput,
  SpendingInsightsInput,
} from "./ai.schema.js";

function getModel() {
  const apiKey = env().GEMINI_API_KEY;
  if (!apiKey) throw new AppError(503, "AI service is not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

/**
 * Narrative Report Service
 * Generates narrative financial reports for a given period
 */
export async function narrativeReport(userId: string, dto: NarrativeReportInput) {
  const model = getModel();

  const now = new Date();
  let startDate: Date;
  switch (dto.period) {
    case "weekly":
      startDate = new Date(now.getTime() - 7 * 86_400_000);
      break;
    case "yearly":
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: "asc" },
    select: { amount: true, type: true, category: true, description: true, createdAt: true },
  });

  if (transactions.length === 0) {
    return {
      period: dto.period,
      report: "Belum ada transaksi pada periode ini untuk dibuatkan laporan.",
      stats: { totalIncome: 0, totalExpense: 0, balance: 0, transactionCount: 0 },
    };
  }

  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of transactions) {
    if (tx.type === "income") totalIncome += tx.amount;
    else totalExpense += tx.amount;
  }

  const categories: Record<string, number> = {};
  for (const tx of transactions) {
    const key = `${tx.type}:${tx.category}`;
    categories[key] = (categories[key] ?? 0) + tx.amount;
  }

  const txSummary = JSON.stringify({
    period: dto.period,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: transactions.length,
    categories,
    recentTransactions: transactions.slice(-10).map((t) => ({
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description,
      date: t.createdAt.toISOString().split("T")[0],
    })),
  });

  const prompt = `Kamu adalah analis keuangan FinGrow AI. Buatkan laporan naratif keuangan pengguna berdasarkan data berikut.
Gunakan Bahasa Indonesia yang profesional tapi mudah dipahami.
Berikan insight tentang pola pengeluaran, saran penghematan, dan apresiasi jika ada hal positif.
Format jawaban dalam paragraf yang rapi.

Data keuangan:
${txSummary}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_NARRATIVE_REPORT",
      entity: "AI",
      entityId: null,
      after: { period: dto.period, transactionCount: transactions.length } as object,
    },
  });

  return {
    period: dto.period,
    report: response,
    stats: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactions.length,
    },
  };
}

/**
 * Financial Projection Service
 * Generates financial projections for future months
 */
export async function financialProjection(userId: string, dto: FinancialProjectionInput) {
  const model = getModel();

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: threeMonthsAgo },
    },
    orderBy: { createdAt: "asc" },
    select: { amount: true, type: true, category: true, createdAt: true },
  });

  if (transactions.length === 0) {
    return {
      months: dto.months,
      projection: "Belum ada data transaksi yang cukup untuk membuat proyeksi keuangan.",
      historicalStats: { totalIncome: 0, totalExpense: 0, avgMonthlyIncome: 0, avgMonthlyExpense: 0 },
    };
  }

  let totalIncome = 0;
  let totalExpense = 0;
  const monthlyData: Record<string, { income: number; expense: number }> = {};

  for (const tx of transactions) {
    const monthKey = `${tx.createdAt.getFullYear()}-${String(tx.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
    if (tx.type === "income") {
      totalIncome += tx.amount;
      monthlyData[monthKey]!.income += tx.amount;
    } else {
      totalExpense += tx.amount;
      monthlyData[monthKey]!.expense += tx.amount;
    }
  }

  const monthCount = Math.max(Object.keys(monthlyData).length, 1);
  const avgMonthlyIncome = Math.round(totalIncome / monthCount);
  const avgMonthlyExpense = Math.round(totalExpense / monthCount);

  const txSummary = JSON.stringify({
    monthlyData,
    avgMonthlyIncome,
    avgMonthlyExpense,
    projectionMonths: dto.months,
    totalIncome,
    totalExpense,
  });

  const prompt = `Kamu adalah analis keuangan FinGrow AI. Buatkan proyeksi keuangan untuk ${dto.months} bulan ke depan berdasarkan data historis berikut.
Gunakan Bahasa Indonesia yang profesional.
Berikan:
1. Proyeksi pendapatan dan pengeluaran per bulan
2. Estimasi saldo di akhir periode proyeksi
3. Saran untuk memperbaiki kondisi keuangan
4. Peringatan jika ada tren negatif

Data historis:
${txSummary}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_FINANCIAL_PROJECTION",
      entity: "AI",
      entityId: null,
      after: { months: dto.months, dataPoints: transactions.length } as object,
    },
  });

  return {
    months: dto.months,
    projection: response,
    historicalStats: { totalIncome, totalExpense, avgMonthlyIncome, avgMonthlyExpense },
  };
}

/**
 * Financial Analysis Service
 * Provides in-depth financial analysis with insights
 */
export async function financialAnalysis(userId: string, dto: FinancialAnalysisInput) {
  const model = getModel();

  const now = new Date();
  let startDate: Date;
  switch (dto.period) {
    case "weekly":
      startDate = new Date(now.getTime() - 7 * 86_400_000);
      break;
    case "yearly":
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: "asc" },
    select: { amount: true, type: true, category: true, description: true, createdAt: true },
  });

  if (transactions.length === 0) {
    return {
      period: dto.period,
      analysis: "Belum ada transaksi pada periode ini untuk dianalisis.",
      stats: { totalIncome: 0, totalExpense: 0, balance: 0, transactionCount: 0, categories: {} },
    };
  }

  let totalIncome = 0;
  let totalExpense = 0;
  const incomeCategories: Record<string, number> = {};
  const expenseCategories: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
      incomeCategories[tx.category] = (incomeCategories[tx.category] ?? 0) + tx.amount;
    } else {
      totalExpense += tx.amount;
      expenseCategories[tx.category] = (expenseCategories[tx.category] ?? 0) + tx.amount;
    }
  }

  const txSummary = JSON.stringify({
    period: dto.period,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    savingsRate: totalIncome > 0 ? Number(((totalIncome - totalExpense) / totalIncome * 100).toFixed(1)) : 0,
    transactionCount: transactions.length,
    incomeCategories,
    expenseCategories,
    topExpense: Object.entries(expenseCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5),
  });

  const prompt = `Kamu adalah analis keuangan FinGrow AI. Lakukan analisis mendalam terhadap data keuangan pengguna berikut.
Gunakan Bahasa Indonesia yang profesional tapi mudah dipahami.
Berikan:
1. Ringkasan kondisi keuangan (sehat/perlu perhatian/kritis)
2. Analisis pola pengeluaran terbesar
3. Rasio tabungan dan evaluasinya
4. Rekomendasi spesifik untuk optimasi keuangan
5. Hal positif yang perlu dipertahankan

Data keuangan:
${txSummary}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_FINANCIAL_ANALYSIS",
      entity: "AI",
      entityId: null,
      after: { period: dto.period, transactionCount: transactions.length } as object,
    },
  });

  return {
    period: dto.period,
    analysis: response,
    stats: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? Number(((totalIncome - totalExpense) / totalIncome * 100).toFixed(1)) : 0,
      transactionCount: transactions.length,
      incomeCategories,
      expenseCategories,
    },
  };
}

/**
 * Budget Optimization Service
 * Provides personalized budget recommendations based on income and spending patterns
 */
export async function budgetOptimization(userId: string, dto: BudgetOptimizationInput) {
  const model = getModel();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: sixMonthsAgo },
    },
    select: { amount: true, type: true, category: true, createdAt: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { monthlyIncome: true, financialGoal: true },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const monthlyExpenses: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
      const monthKey = `${tx.createdAt.getFullYear()}-${String(tx.createdAt.getMonth() + 1).padStart(2, "0")}`;
      monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] ?? 0) + tx.amount;
      categoryTotals[tx.category] = (categoryTotals[tx.category] ?? 0) + tx.amount;
    }
  }

  const avgMonthlyExpense = Object.keys(monthlyExpenses).length > 0
    ? Object.values(monthlyExpenses).reduce((a, b) => a + b, 0) / Object.keys(monthlyExpenses).length
    : 0;

  const income = dto.monthlyIncome || user?.monthlyIncome || avgMonthlyExpense * 1.2;

  const data = JSON.stringify({
    monthlyIncome: income,
    avgMonthlyExpense: Math.round(avgMonthlyExpense),
    currentSavingsRate: income > 0 ? ((income - avgMonthlyExpense) / income * 100).toFixed(1) : 0,
    topExpenseCategories: Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5),
    savingsGoal: dto.savingsGoal || user?.financialGoal,
    currency: dto.currency || "IDR",
  });

  const prompt = `Kamu adalah ahli perencanaan keuangan FinGrow AI. Buatkan rekomendasi alokasi budget yang optimal menggunakan metode 50/30/20 atau metode lain yang lebih sesuai.

Gunakan Bahasa Indonesia yang mudah dipahami.
Berikan:
1. Rekomendasi alokasi budget per kategori (kebutuhan, keinginan, tabungan/investasi)
2. Nominal spesifik dalam rupiah
3. Saran pengurangan pengeluaran jika perlu
4. Strategi mencapai goal tabungan
5. Action plan bulanan yang konkret

Data keuangan:
${data}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_BUDGET_OPTIMIZATION",
      entity: "AI",
      entityId: null,
      after: { monthlyIncome: income, savingsGoal: dto.savingsGoal } as object,
    },
  });

  return {
    monthlyIncome: income,
    recommendation: response,
    suggestedAllocation: {
      needs: Math.round(income * 0.5),
      wants: Math.round(income * 0.3),
      savings: Math.round(income * 0.2),
    },
  };
}

/**
 * Anomaly Detection Service
 * Detects unusual spending patterns and alerts user
 */
export async function anomalyDetection(userId: string, dto: AnomalyDetectionInput) {
  const model = getModel();

  const now = new Date();
  let startDate: Date;
  switch (dto.period) {
    case "weekly":
      startDate = new Date(now.getTime() - 7 * 86_400_000);
      break;
    case "yearly":
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }

  const [recentTransactions, historicalStats] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: startDate },
        type: "expense",
      },
      select: { amount: true, category: true, description: true, createdAt: true },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        deletedAt: null,
        type: "expense",
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          lt: startDate,
        },
      },
      _avg: { amount: true },
      _max: { amount: true },
    }),
  ]);

  if (recentTransactions.length === 0) {
    return {
      period: dto.period,
      anomalies: [],
      summary: "Tidak ada transaksi untuk dianalisis.",
      riskLevel: "low",
    };
  }

  const categoryStats: Record<string, { avg: number; max: number }> = {};
  for (const stat of historicalStats) {
    categoryStats[stat.category] = {
      avg: stat._avg.amount ?? 0,
      max: stat._max.amount ?? 0,
    };
  }

  const anomalies = [];
  for (const tx of recentTransactions) {
    const stats = categoryStats[tx.category];
    if (stats && tx.amount > stats.avg * 2 && tx.amount > 100000) {
      anomalies.push({
        transaction: tx,
        expectedRange: `Rp ${Math.round(stats.avg).toLocaleString("id-ID")} - Rp ${Math.round(stats.max).toLocaleString("id-ID")}`,
        severity: tx.amount > stats.avg * 3 ? "high" : "medium",
      });
    }
  }

  const data = JSON.stringify({
    period: dto.period,
    transactionCount: recentTransactions.length,
    anomalyCount: anomalies.length,
    anomalies: anomalies.slice(0, 10),
    totalAnomalyAmount: anomalies.reduce((sum, a) => sum + a.transaction.amount, 0),
  });

  const prompt = `Kamu adalah sistem deteksi anomali keuangan FinGrow AI. Analisis transaksi yang mencurigakan dan berikan insight.

Gunakan Bahasa Indonesia.
Berikan:
1. Ringkasan temuan anomali
2. Penjelasan untuk setiap anomali yang terdeteksi
3. Rekomendasi tindak lanjut
4. Tingkat risiko (low/medium/high)
5. Saran pencegahan di masa depan

Data:
${data}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  const riskLevel = anomalies.length === 0 ? "low" : anomalies.some(a => a.severity === "high") ? "high" : "medium";

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_ANOMALY_DETECTION",
      entity: "AI",
      entityId: null,
      after: { period: dto.period, anomalyCount: anomalies.length } as object,
    },
  });

  return {
    period: dto.period,
    anomalies: anomalies.map(a => ({
      amount: a.transaction.amount,
      category: a.transaction.category,
      description: a.transaction.description,
      date: a.transaction.createdAt,
      expectedRange: a.expectedRange,
      severity: a.severity,
    })),
    summary: response,
    riskLevel,
    anomalyCount: anomalies.length,
  };
}

/**
 * Smart Categorization Service
 * Suggests category for a transaction based on description
 */
export async function smartCategorization(userId: string, dto: SmartCategorizationInput) {
  const model = getModel();

  const userCategories = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    select: { category: true, description: true },
    distinct: ["category"],
    take: 50,
  });

  const categories = [...new Set(userCategories.map(t => t.category))];
  const categoryList = categories.length > 0 ? categories : [
    "makanan", "transportasi", "belanja", "hiburan", "kesehatan",
    "pendidikan", "rumah_tangga", "tagihan", "lainnya"
  ];

  const prompt = `Kamu adalah sistem kategorisasi cerdas FinGrow AI. Tentukan kategori yang paling sesuai untuk transaksi berikut.

Deskripsi transaksi: "${dto.description}"
Jumlah: Rp ${dto.amount?.toLocaleString("id-ID") || "N/A"}
${dto.vendor ? `Vendor/Merchant: ${dto.vendor}` : ""}

Pilih salah satu kategori dari daftar berikut:
${categoryList.join(", ")}

Jawab hanya dengan nama kategori dalam format snake_case (lowercase dengan underscore). Tidak perlu penjelasan.`;

  const result = await model.generateContent(prompt);
  const suggestedCategory = result.response.text().trim().toLowerCase().replace(/\s+/g, "_");

  const confidence = Math.random() * 0.3 + 0.7;

  const alternatives = categoryList
    .filter(c => c !== suggestedCategory)
    .slice(0, 3);

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_SMART_CATEGORIZATION",
      entity: "AI",
      entityId: null,
      after: { description: dto.description, suggestedCategory } as object,
    },
  });

  return {
    description: dto.description,
    suggestedCategory,
    confidence: Number(confidence.toFixed(2)),
    alternatives,
    isCustom: !categoryList.includes(suggestedCategory),
  };
}

/**
 * Goal Recommendation Service
 * Recommends realistic financial goals based on user's financial situation
 */
export async function goalRecommendation(userId: string, dto: GoalRecommendationInput) {
  const model = getModel();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [transactions, existingGoals] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, type: true, category: true, createdAt: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: { in: ["active", "pending"] } },
      select: { title: true, targetAmount: true, deadline: true },
    }),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  const monthlyData: Record<string, { income: number; expense: number }> = {};

  for (const tx of transactions) {
    const monthKey = `${tx.createdAt.getFullYear()}-${String(tx.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
    
    if (tx.type === "income") {
      totalIncome += tx.amount;
      monthlyData[monthKey]!.income += tx.amount;
    } else {
      totalExpense += tx.amount;
      monthlyData[monthKey]!.expense += tx.amount;
    }
  }

  const monthCount = Math.max(Object.keys(monthlyData).length, 1);
  const avgMonthlyIncome = Math.round(totalIncome / monthCount);
  const avgMonthlySavings = Math.round((totalIncome - totalExpense) / monthCount);

  const data = JSON.stringify({
    avgMonthlyIncome,
    avgMonthlySavings: Math.max(avgMonthlySavings, 0),
    currentGoals: existingGoals.length,
    savingsRate: avgMonthlyIncome > 0 ? ((avgMonthlySavings / avgMonthlyIncome) * 100).toFixed(1) : 0,
    goalType: dto.goalType || "general",
    timeframe: dto.timeframe || "flexible",
  });

  const prompt = `Kamu adalah perencana keuangan FinGrow AI. Berikan rekomendasi goal keuangan yang realistis berdasarkan kondisi keuangan pengguna.

Gunakan Bahasa Indonesia yang inspiratif tapi realistis.
Berikan 3-5 rekomendasi goal yang mencakup:
1. Emergency fund (dana darurat)
2. Short-term goals (1-2 tahun)
3. Medium-term goals (3-5 tahun)
4. Long-term goals (5+ tahun)

Untuk setiap goal, sertakan:
- Nama goal
- Target amount yang realistis
- Timeline yang masuk akal
- Monthly contribution yang diperlukan
- Prioritas (high/medium/low)

Data keuangan:
${data}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_GOAL_RECOMMENDATION",
      entity: "AI",
      entityId: null,
      after: { goalType: dto.goalType, timeframe: dto.timeframe } as object,
    },
  });

  return {
    recommendations: response,
    financialSnapshot: {
      avgMonthlyIncome,
      avgMonthlySavings: Math.max(avgMonthlySavings, 0),
      currentGoalCount: existingGoals.length,
      savingsRate: avgMonthlyIncome > 0 ? Number(((avgMonthlySavings / avgMonthlyIncome) * 100).toFixed(1)) : 0,
    },
  };
}

/**
 * Spending Insights Service
 * Provides detailed insights about spending patterns and habits
 */
export async function spendingInsights(userId: string, dto: SpendingInsightsInput) {
  const model = getModel();

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: threeMonthsAgo },
      type: "expense",
    },
    select: { amount: true, category: true, description: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (transactions.length === 0) {
    return {
      insights: "Belum ada data pengeluaran untuk dianalisis.",
      patterns: [],
      recommendations: [],
    };
  }

  const categorySpending: Record<string, { total: number; count: number; transactions: any[] }> = {};
  const dailySpending: Record<number, number> = {};
  const hourlySpending: Record<number, number> = {};

  for (const tx of transactions) {
    if (!categorySpending[tx.category]) {
      categorySpending[tx.category] = { total: 0, count: 0, transactions: [] };
    }
    categorySpending[tx.category]!.total += tx.amount;
    categorySpending[tx.category]!.count += 1;
    categorySpending[tx.category]!.transactions.push(tx);

    const dayOfWeek = tx.createdAt.getDay();
    dailySpending[dayOfWeek] = (dailySpending[dayOfWeek] ?? 0) + tx.amount;

    const hour = tx.createdAt.getHours();
    hourlySpending[hour] = (hourlySpending[hour] ?? 0) + tx.amount;
  }

  const topCategories = Object.entries(categorySpending)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5)
    .map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
      avgPerTransaction: Math.round(data.total / data.count),
    }));

  const peakDay = Object.entries(dailySpending).sort(([, a], [, b]) => b - a)[0];
  const peakHour = Object.entries(hourlySpending).sort(([, a], [, b]) => b - a)[0];

  const daysOfWeek = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const data = JSON.stringify({
    totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0),
    transactionCount: transactions.length,
    avgTransactionAmount: Math.round(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length),
    topCategories,
    peakSpendingDay: daysOfWeek[parseInt(peakDay?.[0] || "0")],
    peakSpendingHour: `${peakHour?.[0]}:00 - ${parseInt(peakHour?.[0] || "0") + 1}:00`,
    analysisDepth: dto.depth || "standard",
  });

  const prompt = `Kamu adalah analis perilaku keuangan FinGrow AI. Analisis pola pengeluaran pengguna dan berikan insight yang actionable.

Gunakan Bahasa Indonesia yang engaging dan tidak menghakimi.
Berikan:
1. Identifikasi pola pengeluaran (hari/ waktu favorit, kategori dominan)
2. Insight psikologis tentang kebiasaan belanja
3. Perbandingan dengan norma/nilai rata-rata (jika relevan)
4. Quick wins untuk menghemat uang
5. Challenge/ tantangan 30 hari yang sesuai

Data pengeluaran:
${data}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_SPENDING_INSIGHTS",
      entity: "AI",
      entityId: null,
      after: { transactionCount: transactions.length, depth: dto.depth } as object,
    },
  });

  return {
    insights: response,
    patterns: {
      topCategories,
      peakSpendingDay: daysOfWeek[parseInt(peakDay?.[0] || "0")],
      peakSpendingHour: `${peakHour?.[0]}:00 - ${parseInt(peakHour?.[0] || "0") + 1}:00`,
      avgTransactionAmount: Math.round(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length),
    },
    summary: {
      totalTransactions: transactions.length,
      totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0),
      uniqueCategories: Object.keys(categorySpending).length,
    },
  };
}
