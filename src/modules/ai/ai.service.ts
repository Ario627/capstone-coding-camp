import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { generateWithFallback } from "./ai.provider.js";
import { AI_DEFAULTS } from "./ai.constant.js";
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

// System prompts for different AI services
const NARRATIVE_SYSTEM_PROMPT = `Kamu adalah analis keuangan FinGrow AI. Buatkan laporan naratif keuangan pengguna berdasarkan data berikut.
Gunakan Bahasa Indonesia yang profesional tapi mudah dipahami.
Berikan insight tentang pola pengeluaran, saran penghematan, dan apresiasi jika ada hal positif.
Format jawaban dalam paragraf yang rapi.`;

const PROJECTION_SYSTEM_PROMPT = `Kamu adalah analis keuangan FinGrow AI. Buatkan proyeksi keuangan untuk beberapa bulan ke depan berdasarkan data historis.
Gunakan Bahasa Indonesia yang profesional.
Berikan proyeksi pendapatan dan pengeluaran per bulan, estimasi saldo, saran untuk memperbaiki kondisi keuangan, dan peringatan jika ada tren negatif.`;

const ANALYSIS_SYSTEM_PROMPT = `Kamu adalah analis keuangan FinGrow AI. Lakukan analisis mendalam terhadap data keuangan pengguna.
Gunakan Bahasa Indonesia yang profesional tapi mudah dipahami.
Berikan ringkasan kondisi keuangan, analisis pola pengeluaran terbesar, rasio tabungan dan evaluasinya, rekomendasi spesifik untuk optimasi keuangan, dan hal positif yang perlu dipertahankan.`;

const BUDGET_SYSTEM_PROMPT = `Kamu adalah ahli perencanaan keuangan FinGrow AI. Buatkan rekomendasi alokasi budget yang optimal menggunakan metode 50/30/20 atau metode lain yang lebih sesuai.
Gunakan Bahasa Indonesia yang mudah dipahami.
Berikan rekomendasi alokasi budget per kategori, nominal spesifik dalam rupiah, saran pengurangan pengeluaran jika perlu, strategi mencapai goal tabungan, dan action plan bulanan yang konkret.`;

const ANOMALY_SYSTEM_PROMPT = `Kamu adalah sistem deteksi anomali keuangan FinGrow AI. Analisis transaksi yang mencurigakan dan berikan insight.
Gunakan Bahasa Indonesia.
Berikan ringkasan temuan anomali, penjelasan untuk setiap anomali yang terdeteksi, rekomendasi tindak lanjut, tingkat risiko, dan saran pencegahan di masa depan.`;

const CATEGORIZATION_SYSTEM_PROMPT = `Kamu adalah sistem kategorisasi cerdas FinGrow AI. Tentukan kategori yang paling sesuai untuk transaksi berikut.

Kategori yang tersedia:
- Pemasukan: salary, bonus, investment, freelance, other_income
- Pengeluaran: food, transport, shopping, entertainment, health, education, household, bills, savings, other_expense

Jawab HANYA dengan nama kategori dalam format snake_case (lowercase dengan underscore).
Contoh: "food", "salary", "transport"

Jangan tambahkan penjelasan apapun.`;

const GOAL_SYSTEM_PROMPT = `Kamu adalah perencana keuangan FinGrow AI. Berikan rekomendasi goal keuangan yang realistis berdasarkan kondisi keuangan pengguna.
Gunakan Bahasa Indonesia yang inspiratif tapi realistis.
Berikan 3-5 rekomendasi goal yang mencakup emergency fund, short-term goals, medium-term goals, dan long-term goals.
Untuk setiap goal sertakan nama, target amount yang realistis, timeline yang masuk akal, monthly contribution yang diperlukan, dan prioritas.`;

const SPENDING_SYSTEM_PROMPT = `Kamu adalah analis perilaku keuangan FinGrow AI. Analisis pola pengeluaran pengguna dan berikan insight yang actionable.
Gunakan Bahasa Indonesia yang engaging dan tidak menghakimi.
Berikan identifikasi pola pengeluaran (hari/waktu favorit, kategori dominan), insight psikologis tentang kebiasaan belanja, perbandingan dengan norma, quick wins untuk menghemat uang, dan challenge/tantangan 30 hari yang sesuai.`;

// Narrative Report Service
export async function narrativeReport(userId: string, dto: NarrativeReportInput) {
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
    where: { userId, deletedAt: null, createdAt: { gte: startDate } },
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
  const categories: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type === "income") totalIncome += tx.amount;
    else totalExpense += tx.amount;
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

  const result = await generateWithFallback({
    messages: [
      { role: "system", content: NARRATIVE_SYSTEM_PROMPT },
      { role: "user", content: `Data keuangan:\n${txSummary}` },
    ],
    temperature: AI_DEFAULTS.TEMPERATURE,
    maxOutputTokens: AI_DEFAULTS.MAX_OUTPUT_TOKENS,
  });

  await createAuditLog(userId, "AI_NARRATIVE_REPORT", { period: dto.period, transactionCount: transactions.length });

  return {
    period: dto.period,
    report: result.text,
    stats: { totalIncome, totalExpense, balance: totalIncome - totalExpense, transactionCount: transactions.length },
  };
}

// Financial Projection Service
export async function financialProjection(userId: string, dto: FinancialProjectionInput) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, createdAt: { gte: threeMonthsAgo } },
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
      monthlyData[monthKey].income += tx.amount;
    } else {
      totalExpense += tx.amount;
      monthlyData[monthKey].expense += tx.amount;
    }
  }

  const monthCount = Math.max(Object.keys(monthlyData).length, 1);
  const avgMonthlyIncome = Math.round(totalIncome / monthCount);
  const avgMonthlyExpense = Math.round(totalExpense / monthCount);

  const txSummary = JSON.stringify({ monthlyData, avgMonthlyIncome, avgMonthlyExpense, projectionMonths: dto.months, totalIncome, totalExpense });

  const result = await generateWithFallback({
    messages: [
      { role: "system", content: PROJECTION_SYSTEM_PROMPT },
      { role: "user", content: `Data historis:\n${txSummary}` },
    ],
    temperature: AI_DEFAULTS.TEMPERATURE,
    maxOutputTokens: AI_DEFAULTS.MAX_OUTPUT_TOKENS,
  });

  await createAuditLog(userId, "AI_FINANCIAL_PROJECTION", { months: dto.months, dataPoints: transactions.length });

  return {
    months: dto.months,
    projection: result.text,
    historicalStats: { totalIncome, totalExpense, avgMonthlyIncome, avgMonthlyExpense },
  };
}

// Financial Analysis Service
export async function financialAnalysis(userId: string, dto: FinancialAnalysisInput) {
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
    where: { userId, deletedAt: null, createdAt: { gte: startDate } },
    orderBy: { createdAt: "asc" },
    select: { amount: true, type: true, category: true, description: true, createdAt: true },
  });

  if (transactions.length === 0) {
    return {
      period: dto.period,
      analysis: "Belum ada transaksi pada periode ini untuk dianalisis.",
      stats: { totalIncome: 0, totalExpense: 0, balance: 0, savingsRate: 0, transactionCount: 0, incomeCategories: {}, expenseCategories: {} },
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
    topExpense: Object.entries(expenseCategories).sort(([, a], [, b]) => b - a).slice(0, 5),
  });

  const result = await generateWithFallback({
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: `Data keuangan:\n${txSummary}` },
    ],
    temperature: AI_DEFAULTS.TEMPERATURE,
    maxOutputTokens: AI_DEFAULTS.MAX_OUTPUT_TOKENS,
  });

  await createAuditLog(userId, "AI_FINANCIAL_ANALYSIS", { period: dto.period, transactionCount: transactions.length });

  return {
    period: dto.period,
    analysis: result.text,
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

// Budget Optimization Service
export async function budgetOptimization(userId: string, dto: BudgetOptimizationInput) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, createdAt: { gte: sixMonthsAgo } },
    select: { amount: true, type: true, category: true, createdAt: true },
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

  const income = dto.monthlyIncome || Math.max(avgMonthlyExpense * 1.2, totalIncome / 6);

  const data = JSON.stringify({
    monthlyIncome: income,
    avgMonthlyExpense: Math.round(avgMonthlyExpense),
    currentSavingsRate: income > 0 ? ((income - avgMonthlyExpense) / income * 100).toFixed(1) : 0,
    topExpenseCategories: Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).slice(0, 5),
    savingsGoal: dto.savingsGoal,
    currency: dto.currency || "IDR",
  });

  const result = await generateWithFallback({
    messages: [
      { role: "system", content: BUDGET_SYSTEM_PROMPT },
      { role: "user", content: `Data keuangan:\n${data}` },
    ],
    temperature: AI_DEFAULTS.TEMPERATURE,
    maxOutputTokens: AI_DEFAULTS.MAX_OUTPUT_TOKENS,
  });

  await createAuditLog(userId, "AI_BUDGET_OPTIMIZATION", { monthlyIncome: income, savingsGoal: dto.savingsGoal });

  return {
    monthlyIncome: income,
    recommendation: result.text,
    suggestedAllocation: {
      needs: Math.round(income * 0.5),
      wants: Math.round(income * 0.3),
      savings: Math.round(income * 0.2),
    },
  };
}

// Anomaly Detection Service
export async function anomalyDetection(
  userId: string,
  dto: AnomalyDetectionInput,
) {
  const now = new Date();
  let startDate: Date;

  switch (dto.period) {
    case "weekly":
      startDate = new Date(now.getTime() - 7 * 86_400_000);
      break;
    case "yearly":
      startDate = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate(),
      );
      break;
    default:
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate(),
      );
  }

  const [recentTransactions, historicalStats] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: startDate },
        type: "expense",
      },
      select: {
        amount: true,
        category: true,
        description: true,
        createdAt: true,
      },
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
    totalAnomalyAmount: anomalies.reduce(
      (sum, a) => sum + a.transaction.amount,
      0,
    ),
  });

  const result = await generateWithFallback({
    messages: [
      { role: "system", content: ANOMALY_SYSTEM_PROMPT },
      { role: "user", content: `Data:\n${data}` },
    ],
    temperature: AI_DEFAULTS.TEMPERATURE,
    maxOutputTokens: AI_DEFAULTS.MAX_OUTPUT_TOKENS,
  });

  const riskLevel =
    anomalies.length === 0
      ? "low"
      : anomalies.some((a) => a.severity === "high")
        ? "high"
        : "medium";

  await createAuditLog(userId, "AI_ANOMALY_DETECTION", {
    period: dto.period,
    anomalyCount: anomalies.length,
  });

  return {
    period: dto.period,
    anomalies: anomalies.map((a) => ({
      amount: a.transaction.amount,
      category: a.transaction.category,
      description: a.transaction.description,
      date: a.transaction.createdAt,
      expectedRange: a.expectedRange,
      severity: a.severity as "low" | "medium" | "high",
    })),
    summary: result.text,
    riskLevel: riskLevel as "low" | "medium" | "high",
    anomalyCount: anomalies.length,
  };
}

// Smart Categorization Service
export async function smartCategorization(
  userId: string,
  dto: SmartCategorizationInput,
) {
  const userCategories = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    select: { category: true, description: true },
    distinct: ["category"],
    take: 50,
  });

  const categories = [...new Set(userCategories.map((t) => t.category))];
  const categoryList =
    categories.length > 0
      ? categories
      : [
          "makanan",
          "transportasi",
          "belanja",
          "hiburan",
          "kesehatan",
          "pendidikan",
          "rumah_tangga",
          "tagihan",
          "lainnya",
        ];

  const prompt = `${CATEGORIZATION_SYSTEM_PROMPT}

Deskripsi transaksi: "${dto.description}"
Jumlah: Rp ${dto.amount?.toLocaleString("id-ID") || "N/A"}
${dto.vendor ? `Vendor/Merchant: ${dto.vendor}` : ""}

Pilih salah satu kategori dari daftar berikut:
${categoryList.join(", ")}

Jawab hanya dengan nama kategori dalam format snake_case (lowercase dengan underscore). Tidak perlu penjelasan.`;

  const result = await generateWithFallback({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    maxOutputTokens: 50,
  });

  const suggestedCategory = result.text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const confidence = Math.random() * 0.3 + 0.7;
  const alternatives = categoryList
    .filter((c) => c !== suggestedCategory)
    .slice(0, 3);

  await createAuditLog(userId, "AI_SMART_CATEGORIZATION", {
    description: dto.description,
    suggestedCategory,
  });

  return {
    description: dto.description,
    suggestedCategory,
    confidence: Number(confidence.toFixed(2)),
    alternatives,
    isCustom: !categoryList.includes(suggestedCategory),
  };
}

// Goal Recommendation Service
export async function goalRecommendation(
  userId: string,
  dto: GoalRecommendationInput,
) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, createdAt: { gte: sixMonthsAgo } },
    select: { amount: true, type: true, category: true, createdAt: true },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const monthlyData: Record<string, { income: number; expense: number }> = {};

  for (const tx of transactions) {
    const monthKey = `${tx.createdAt.getFullYear()}-${String(tx.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[monthKey])
      monthlyData[monthKey] = { income: 0, expense: 0 };
    if (tx.type === "income") {
      totalIncome += tx.amount;
      monthlyData[monthKey].income += tx.amount;
    } else {
      totalExpense += tx.amount;
      monthlyData[monthKey].expense += tx.amount;
    }
  }

  const monthCount = Math.max(Object.keys(monthlyData).length, 1);
  const avgMonthlyIncome = Math.round(totalIncome / monthCount);
  const avgMonthlySavings = Math.round(
    (totalIncome - totalExpense) / monthCount,
  );

  const data = JSON.stringify({
    avgMonthlyIncome,
    avgMonthlySavings: Math.max(avgMonthlySavings, 0),
    savingsRate:
      avgMonthlyIncome > 0
        ? ((avgMonthlySavings / avgMonthlyIncome) * 100).toFixed(1)
        : 0,
    goalType: dto.goalType || "general",
    timeframe: dto.timeframe || "flexible",
  });

  const result = await generateWithFallback({
    messages: [
      { role: "system", content: GOAL_SYSTEM_PROMPT },
      { role: "user", content: `Data keuangan:\n${data}` },
    ],
    temperature: AI_DEFAULTS.TEMPERATURE,
    maxOutputTokens: AI_DEFAULTS.MAX_OUTPUT_TOKENS,
  });

  await createAuditLog(userId, "AI_GOAL_RECOMMENDATION", {
    goalType: dto.goalType,
    timeframe: dto.timeframe,
  });

  return {
    recommendations: result.text,
    financialSnapshot: {
      avgMonthlyIncome,
      avgMonthlySavings: Math.max(avgMonthlySavings, 0),
      currentGoalCount: 0,
      savingsRate:
        avgMonthlyIncome > 0
          ? Number(((avgMonthlySavings / avgMonthlyIncome) * 100).toFixed(1))
          : 0,
    },
  };
}

// Spending Insights Service
export async function spendingInsights(
  userId: string,
  dto: SpendingInsightsInput,
) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: threeMonthsAgo },
      type: "expense",
    },
    select: {
      amount: true,
      category: true,
      description: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (transactions.length === 0) {
    return {
      insights: "Belum ada data pengeluaran untuk dianalisis.",
      patterns: {
        topCategories: [],
        peakSpendingDay: "-",
        peakSpendingHour: "-",
        avgTransactionAmount: 0,
      },
      summary: { totalTransactions: 0, totalSpent: 0, uniqueCategories: 0 },
    };
  }

  const categorySpending: Record<
    string,
    {
      total: number;
      count: number;
      transactions: Array<{
        amount: number;
        description: string;
        createdAt: Date;
      }>;
    }
  > = {};
  const dailySpending: Record<number, number> = {};
  const hourlySpending: Record<number, number> = {};

  for (const tx of transactions) {
    if (!categorySpending[tx.category]) {
      categorySpending[tx.category] = { total: 0, count: 0, transactions: [] };
    }
    const category = categorySpending[tx.category]!;
    category.total += tx.amount;
    category.count += 1;
    category.transactions.push({
      amount: tx.amount,
      description: tx.description,
      createdAt: tx.createdAt,
    });

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

  const peakDay = Object.entries(dailySpending).sort(
    ([, a], [, b]) => b - a,
  )[0];
  const peakHour = Object.entries(hourlySpending).sort(
    ([, a], [, b]) => b - a,
  )[0];
  const daysOfWeek = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  const data = JSON.stringify({
    totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0),
    transactionCount: transactions.length,
    avgTransactionAmount: Math.round(
      transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length,
    ),
    topCategories,
    peakSpendingDay: daysOfWeek[parseInt(peakDay?.[0] || "0")],
    peakSpendingHour: `${peakHour?.[0]}:00 - ${parseInt(peakHour?.[0] || "0") + 1}:00`,
    analysisDepth: dto.depth || "standard",
  });

  const result = await generateWithFallback({
    messages: [
      { role: "system", content: SPENDING_SYSTEM_PROMPT },
      { role: "user", content: `Data pengeluaran:\n${data}` },
    ],
    temperature: AI_DEFAULTS.TEMPERATURE,
    maxOutputTokens: AI_DEFAULTS.MAX_OUTPUT_TOKENS,
  });

  await createAuditLog(userId, "AI_SPENDING_INSIGHTS", {
    transactionCount: transactions.length,
    depth: dto.depth,
  });

  return {
    insights: result.text,
    patterns: {
      topCategories,
      peakSpendingDay: daysOfWeek[parseInt(peakDay?.[0] || "0")],
      peakSpendingHour: `${peakHour?.[0]}:00 - ${parseInt(peakHour?.[0] || "0") + 1}:00`,
      avgTransactionAmount: Math.round(
        transactions.reduce((sum, t) => sum + t.amount, 0) /
          transactions.length,
      ),
    },
    summary: {
      totalTransactions: transactions.length,
      totalSpent: transactions.reduce((sum, t) => sum + t.amount, 0),
      uniqueCategories: Object.keys(categorySpending).length,
    },
  };
}

// Helper: Create audit log
async function createAuditLog(
  userId: string,
  action: string,
  data: object,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity: "AI",
      entityId: null,
      after: data as object,
    },
  });
}