import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.config.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type {
  EducationChatInput,
  NarrativeReportInput,
  FinancialProjectionInput,
  FinancialAnalysisInput,
} from "./ai.schema.js";

function getModel() {
  const apiKey = env().GEMINI_API_KEY;
  if (!apiKey) throw new AppError(503, "AI service is not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

// Education Chat 
export async function educationChat(userId: string, dto: EducationChatInput) {
  const model = getModel();

  const systemPrompt = `Kamu adalah asisten edukasi keuangan bernama FinGrow AI.
Kamu membantu pengguna memahami literasi keuangan dengan bahasa yang mudah dipahami, dalam Bahasa Indonesia.
Topik yang bisa kamu bahas: tabungan, investasi, budgeting, utang, pajak, keuangan UMKM.
Jawab dengan ringkas, praktis, dan berikan contoh nyata jika memungkinkan.
Jangan memberikan saran investasi spesifik atau rekomendasi produk keuangan tertentu.
${dto.context ? `Fokus pada topik: ${dto.context}` : ""}`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: dto.message },
  ]);

  const response = result.response.text();

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_EDUCATION_CHAT",
      entity: "AI",
      entityId: null,
      after: { context: dto.context ?? "general" } as object,
    },
  });

  return { reply: response, context: dto.context ?? "general" };
}

// Narrative Report

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

// Financial Projection

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

// Financial Analysis

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