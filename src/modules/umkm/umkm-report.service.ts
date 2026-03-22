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

  if (startDateInput && endDateInput) {
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
    totalIncome > 0 ? Number(((netProfit / totalIncome) * 100).toFixed(2)) : 0;

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
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
            ),
          ),
      ),
      avgDailyExpense: Math.round(
        totalExpense /
          Math.max(
            1,
            Math.ceil(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
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

export async function getDetailedInventoryValuation(
  userId: string,
  businessId: string,
) {
  const business = await verifyBusinessOwnership(userId, businessId);

  const items = await prisma.inventoryItem.findMany({
    where: { businessId, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      quantity: true,
      unitPrice: true,
      costPrice: true,
      unit: true,
      minStock: true,
      maxStock: true,
      imageUrl: true,
    },
  });

  let totalRetailValue = new Decimal(0);
  let totalCostValue = new Decimal(0);
  let totalQuantity = 0;
  let lowStockCount = 0;
  let overStockCount = 0;

  const enrichedItems = items.map((item) => {
    const unitPrice = new Decimal(item.unitPrice.toString());
    const costPrice = new Decimal(item.costPrice.toString());
    const retailValue = unitPrice.mul(item.quantity);
    const costValue = costPrice.mul(item.quantity);
    const margin = retailValue.minus(costValue);
    const marginPercentage = unitPrice.gt(0)
      ? Number(unitPrice.minus(costPrice).div(unitPrice).mul(100).toFixed(2))
      : 0;

    totalRetailValue = totalRetailValue.plus(retailValue);
    totalCostValue = totalCostValue.plus(costValue);
    totalQuantity += item.quantity;

    const isLowStock = item.quantity <= item.minStock;
    const isOverStock = item.maxStock !== null && item.quantity > item.maxStock;

    if (isLowStock) lowStockCount++;
    if (isOverStock) overStockCount++;

    return {
      ...item,
      unitPrice: item.unitPrice.toString(),
      costPrice: item.costPrice.toString(),
      retailValue: retailValue.toFixed(2),
      costValue: costValue.toFixed(2),
      margin: margin.toFixed(2),
      marginPercentage,
      isLowStock,
      isOverStock,
      stockStatus: isLowStock
        ? ("low" as const)
        : isOverStock
          ? ("overstock" as const)
          : ("optimal" as const),
    };
  });

  enrichedItems.sort((a, b) => b.marginPercentage - a.marginPercentage);

  return {
    business: {
      id: business.id,
      name: business.name,
    },
    summary: {
      totalProducts: items.length,
      totalQuantity,
      totalRetailValue: totalRetailValue.toFixed(2),
      totalCostValue: totalCostValue.toFixed(2),
      totalPotentialProfit: totalRetailValue.minus(totalCostValue).toFixed(2),
      averageMargin:
        items.length > 0
          ? Number(
              totalRetailValue
                .minus(totalCostValue)
                .div(totalRetailValue)
                .mul(100)
                .toFixed(2),
            )
          : 0,
      lowStockCount,
      overStockCount,
    },
    items: enrichedItems,
    alerts: {
      lowStock: enrichedItems.filter((i) => i.isLowStock),
      overStock: enrichedItems.filter((i) => i.isOverStock),
    },
  };
}

export async function getCashFlowAnalysis(
  userId: string,
  businessId: string,
  months: number = 6,
) {
  const business = await verifyBusinessOwnership(userId, businessId);

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  // Get all transactions 
  const transactions = await prisma.businessTransaction.findMany({
    where: {
      businessId,
      deletedAt: null,
      transactionDate: { gte: startDate },
    },
    select: {
      type: true,
      amount: true,
      category: true,
      transactionDate: true,
    },
    orderBy: { transactionDate: "asc" },
  });

  // Group by month
  const monthlyData: Record<string, { income: number; expense: number }> = {};

  // Initialize all months
  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[key] = { income: 0, expense: 0 };
  }

  for (const tx of transactions) {
    const monthKey = `${tx.transactionDate.getFullYear()}-${String(tx.transactionDate.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    if (tx.type === "income") {
      monthlyData[monthKey].income += tx.amount;
    } else {
      monthlyData[monthKey].expense += tx.amount;
    }
  }

  // Sort and format
  const sortedMonths = Object.keys(monthlyData).sort();
  let runningBalance = 0;
  const cashFlow = sortedMonths.map((month) => {
    const income = monthlyData[month]!.income;
    const expense = monthlyData[month]!.expense;
    const netCashFlow = income - expense;
    runningBalance += netCashFlow;

    return {
      month,
      income,
      expense,
      netCashFlow,
      cumulativeBalance: runningBalance,
    };
  });

  // Calculate averages
  const avgMonthlyIncome =
    cashFlow.reduce((sum, m) => sum + m.income, 0) / months;
  const avgMonthlyExpense =
    cashFlow.reduce((sum, m) => sum + m.expense, 0) / months;

  return {
    business: {
      id: business.id,
      name: business.name,
    },
    period: `${months} bulan terakhir`,
    cashFlow,
    summary: {
      totalIncome: cashFlow.reduce((sum, m) => sum + m.income, 0),
      totalExpense: cashFlow.reduce((sum, m) => sum + m.expense, 0),
      avgMonthlyIncome: Math.round(avgMonthlyIncome),
      avgMonthlyExpense: Math.round(avgMonthlyExpense),
      avgMonthlyNetCashFlow: Math.round(avgMonthlyIncome - avgMonthlyExpense),
      finalBalance: runningBalance,
    },
  };
}

// Get report data for AI narrative 
export async function getReportDataForAI(
  userId: string,
  businessId: string,
  period: string,
) {
  const summary = await getFinancialSummary(userId, businessId, period);
  const inventory = await getDetailedInventoryValuation(userId, businessId);

  return {
    business: summary.business,
    period: summary.period,
    financial: {
      income: summary.summary.totalIncome,
      expense: summary.summary.totalExpense,
      netProfit: summary.summary.netProfit,
      profitMargin: summary.summary.profitMargin,
      transactionCount: summary.summary.transactionCount,
      topIncomeCategories: summary.transactions.incomeByCategory.slice(0, 5),
      topExpenseCategories: summary.transactions.expenseByCategory.slice(0, 5),
    },
    inventory: {
      totalProducts: inventory.summary.totalProducts,
      totalQuantity: inventory.summary.totalQuantity,
      totalValue: inventory.summary.totalRetailValue,
      potentialProfit: inventory.summary.totalPotentialProfit,
      lowStockCount: inventory.summary.lowStockCount,
      lowStockItems: inventory.alerts.lowStock.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        minStock: i.minStock,
      })),
    },
  };
}