import * as businessService from "./business.service.js";
import * as inventoryService from "./inventory.service.js";
import * as businessTransactionService from "./business-transaction.service.js";

export {
  createBusiness,
  listBusinesses,
  getBusiness,
  updateBusiness,
  deleteBusiness,
  getBusinessStats,
} from "./business.service.js";

export {
  createBusinessTransaction,
  listBusinessTransactions,
  getBusinessTransaction,
  updateBusinessTransaction,
  deleteBusinessTransaction,
  getBusinessTransactionSummary,
  getBusinessTransactionTrend,
} from "./business-transaction.service.js";

export {
  getFinancialSummary,
  getDetailedInventoryValuation,
  getCashFlowAnalysis,
  getReportDataForAI,
} from "./umkm-report.service.js";

export async function getSalesReport(userId: string) {
  const business = await businessService.listBusinesses(userId, {
    page: 1,
    limit: 100,
  });

  if (business.items.length === 0) {
    return {
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      incomeTransactions: 0,
      expenseTransactions: 0,
      categoryBreakdown: [],
      recentSales: [],
      businesses: [],
    };
  }

  const businessId = business.items.map((b) => b.id);

  const [incomeAgg, expenseAgg, recentSales, categoryBreakdown] =
    await Promise.all([
      businessTransactionService.getBusinessTransactionSummary(
        userId,
        businessId[0] as string,
      ),
      Promise.resolve({ summary: { totalExpense: 0, expenseCount: 0 } }),
      businessTransactionService.listBusinessTransactions(
        userId,
        businessId[0] as string,
        { page: 1, limit: 10 },
      ),
      Promise.resolve([]),
    ]);

  return {
    totalIncome: incomeAgg.summary.totalIncome,
    totalExpense: incomeAgg.summary.totalExpense,
    netProfit: incomeAgg.summary.netProfit,
    incomeTransactions: incomeAgg.summary.incomeCount,
    expenseTransactions: incomeAgg.summary.expenseCount,
    categoryBreakdown: [
      ...incomeAgg.incomeByCategory.map((c) => ({
        category: c.category,
        total: c.total,
        count: c.count,
        type: "income",
      })),
      ...incomeAgg.expenseByCategory.map((c) => ({
        category: c.category,
        total: c.total,
        count: c.count,
        type: "expense",
      })),
    ],
    recentSales: incomeAgg.recentTransactions,
    businesses: business.items.map((b) => ({
      id: b.id,
      name: b.name,
      transactionCount: b.transactionCount,
    })),
  };
}

export async function getInventoryValuation(
  userId: string,
  businessId: string,
) {
  return inventoryService.getInventoryValuation(userId, businessId);
}



export type {
  CreateBusinessInput,
  UpdateBusinessInput,
  BusinessListQuery,
  CreateBusinessTransactionInput,
  UpdateBusinessTransactionInput,
  BusinessTransactionListQuery,
  CreateInventoryInput,
  UpdateInventoryInput,
  InventoryListQuery,
  AdjustStockInput,
  ReportPeriod,
} from "./umkm.schema.js";