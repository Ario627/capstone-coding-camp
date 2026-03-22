import { Decimal } from "decimal.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type { ReportPeriod } from "./umkm.schema.js";
import { verifyBusinessOwnership } from "./business.service.js";

function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date();

  switch (period) {
    case "daily":
      startDate.setDate(now.getDate() - 1);
      break;
    case "weekly":
      startDate.setDate(now.getDate() - 7);
      break;
    case "yearly":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case "monthly":
    default:
      startDate.setMonth(now.getMonth() - 1);
      break;
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

export async function getFinancialSummary(
  userId: string,
  businessId: string,
  periodInput?: string,
  startDateInput?: Date | string,
  endDateInput?: Date | string,
) {
    const business = await verifyBusinessOwnership(userId, businessId);

    let startDate: Date;
    let endDate: Date;

    if(startDateInput && endDateInput) {
        startDate =
          startDateInput instanceof Date
            ? startDateInput
            : new Date(startDateInput);
        endDate =
          endDateInput instanceof Date ? endDateInput : new Date(endDateInput);
        endDate.setHours(23, 59, 59, 999);
    } else {
        const range = getDateRange(periodInput || "monthly");
        startDate = range.startDate;
        endDate = range.endDate;
    }


    const [
      incomeAgg,
      expenseAgg,
      incomeByCategory,
      expenseByCategory,
      inventoryStats,
      transactionTrend,
    ] = await Promise.all([
      prisma.businessTransaction.aggregate({
        where: {
          businessId,
          type: "income",
          deletedAt: null,
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),

      //expense
      prisma.businessTransaction.aggregate({
        where: {
          businessId,
          type: "expense",
          deletedAt: null,
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),

      //income by category
      prisma.businessTransaction.groupBy({
        by: ["category"],
        where: {
          businessId,
          type: "income",
          deletedAt: null,
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
      }),


      // expense by category
      prisma.businessTransaction.groupBy({
        by: ["category"],
        where: {
          businessId,
          type: "expense",
          deletedAt: null,
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
      }),

      //inventory stats
      prisma.inventoryItem.aggregate({
        where: { businessId, deletedAt: null, isActive: true },
        _count: true,
        _sum: { quantity: true },
      }),

      prisma.businessTransaction.groupBy({
        by: ["type", "transactionDate"],
        where: {
          businessId,
          deletedAt: null,
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        orderBy: { transactionDate: "asc" },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpense = expenseAgg._sum.amount || 0;
    const netProfit = totalIncome - totalExpense;
    const transactionCount = incomeAgg._count + expenseAgg._count;

    const profitMargin =
      totalIncome > 0
        ? Number(((netProfit / totalIncome) * 100).toFixed(2))
        : 0;

    // Format category breakdowns
    const incomeBreakdown = incomeByCategory.map((c) => ({
      category: c.category,
      total: c._sum.amount || 0,
      count: c._count,
      percentage:
        totalIncome > 0
          ? Number((((c._sum.amount || 0) / totalIncome) * 100).toFixed(2))
          : 0,
    }));

    const expenseBreakdown = expenseByCategory.map((c) => ({
      category: c.category,
      total: c._sum.amount || 0,
      count: c._count,
      percentage:
        totalExpense > 0
          ? Number((((c._sum.amount || 0) / totalExpense) * 100).toFixed(2))
          : 0,
    }));

    // Format trend data
    const trendMap = new Map<string, { income: number; expense: number }>();
    for (const t of transactionTrend) {
      const dateKey = t.transactionDate.toISOString().split("T")[0]!;
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, { income: 0, expense: 0 });
      }
      const entry = trendMap.get(dateKey)!;
      if (t.type === "income") {
        entry.income += t._sum.amount || 0;
      } else {
        entry.expense += t._sum.amount || 0;
      }
    }

    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30) // Last 30 days max
      .map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }));

    return {
      business: {
        id: business.id,
        name: business.name,
        type: business.type,
        category: business.category,
      },
      period: {
        type: periodInput || "monthly",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalIncome,
        totalExpense,
        netProfit,
        profitMargin,
        transactionCount,
        avgDailyIncome: Math.round(
          totalIncome /
            Math.max(
              1,
              Math.ceil(
                (endDate.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            ),
        ),
        avgDailyExpense: Math.round(
          totalExpense /
            Math.max(
              1,
              Math.ceil(
                (endDate.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            ),
        ),
      },
      transactions: {
        incomeCount: incomeAgg._count,
        expenseCount: expenseAgg._count,
        incomeByCategory: incomeBreakdown,
        expenseByCategory: expenseBreakdown,
      },
      inventory: {
        totalProducts: inventoryStats._count,
        totalQuantity: inventoryStats._sum.quantity || 0,
      },
      trend,
    };
}