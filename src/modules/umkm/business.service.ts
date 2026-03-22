import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { UMKM_AUDIT_ACTIONS, UMKM_ERROR_MESSAGES } from "./umkm.constant.js";
import { Decimal } from "decimal.js";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
  BusinessListQuery,
} from "./umkm.schema.js";
import { getFinancialSummary } from "./umkm-report.service.js";

export async function verifyBusinessOwnership(
  userId: string,
  businessId: string,
) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      name: true,
      type: true,
      address: true,
      lat: true,
      lng: true,
      category: true,
    },
  });

  if (!business)
    throw new AppError(404, UMKM_ERROR_MESSAGES.BUSINESS_NOT_FOUND);

  if (business.userId !== userId)
    throw new AppError(403, UMKM_ERROR_MESSAGES.BUSINESS_UNAUTHORIZED);

  return business;
}

export async function createBusiness(userId: string, dto: CreateBusinessInput) {
  if (dto.lat !== undefined && dto.lat !== null)
    throw new AppError(400, UMKM_ERROR_MESSAGES.LAT_LNG_REQUIRED);

  if (dto.lng !== undefined && dto.lng !== null) {
    if (dto.lat === undefined || dto.lat === null) {
      throw new AppError(400, UMKM_ERROR_MESSAGES.LAT_LNG_REQUIRED);
    }
  }

  const business = await prisma.business.create({
    data: {
      userId,
      name: dto.name,
      type: dto.type,
      description: dto.description ?? null,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      category: dto.category ?? null,
    },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      address: true,
      phone: true,
      lat: true,
      lng: true,
      category: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  //Audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.BUSINESS_CREATED,
      entity: "Business",
      entityId: business.id,
      after: {
        name: business.name,
        type: business.type,
        category: business.category,
      },
    },
  });

  return business;
}

export async function listBusinesses(userId: string, query: BusinessListQuery) {
  const { page = 1, limit = 10, search, category, isActive } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    userId,
    deletedAt: null,
  };

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }

  // Category filter
  if (category) {
    where.category = category;
  }

  // Active status filter
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [total, items] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        address: true,
        phone: true,
        lat: true,
        lng: true,
        category: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            inventoryItems: { where: { deletedAt: null } },
            businessTransactions: { where: { deletedAt: null } },
          },
        },
      },
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: items.map((item) => ({
      ...item,
      inventoryCount: item._count.inventoryItems,
      transactionCount: item._count.businessTransactions,
    })),
  };
}

export async function getBusiness(userId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      name: true,
      type: true,
      description: true,
      address: true,
      phone: true,
      lat: true,
      lng: true,
      category: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          inventoryItems: { where: { deletedAt: null } },
          businessTransactions: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!business) {
    throw new AppError(404, UMKM_ERROR_MESSAGES.BUSINESS_NOT_FOUND);
  }

  if (business.userId !== userId) {
    throw new AppError(403, UMKM_ERROR_MESSAGES.BUSINESS_UNAUTHORIZED);
  }

  const { _count, ...businessData } = business;

  return {
    ...businessData,
    inventoryCount: _count.inventoryItems,
    transactionCount: _count.businessTransactions,
  };
}

export async function updateBusiness(
  userId: string,
  businessId: string,
  dto: UpdateBusinessInput,
) {
  const existing = await verifyBusinessOwnership(userId, businessId);

  if (dto.lat !== undefined && dto.lat !== null) {
    const lngValue = dto.lng ?? existing.lng;
    if (lngValue === null || lngValue === undefined) {
      throw new AppError(400, UMKM_ERROR_MESSAGES.LAT_LNG_REQUIRED);
    }
  }
  if (dto.lng !== undefined && dto.lng !== null) {
    const latValue = dto.lat ?? existing.lat;
    if (latValue === null || latValue === undefined) {
      throw new AppError(400, UMKM_ERROR_MESSAGES.LAT_LNG_REQUIRED);
    }
  }

  const data = Object.fromEntries(
    Object.entries(dto).filter(([_, value]) => value !== undefined),
  );

  const updated = await prisma.business.update({
    where: { id: businessId },
    data,
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      address: true,
      phone: true,
      lat: true,
      lng: true,
      category: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.BUSINESS_UPDATED,
      entity: "Business",
      entityId: updated.id,
      before: {
        name: existing.name,
        type: existing.type,
        address: existing.address,
      },
      after: {
        name: updated.name,
        type: updated.type,
        address: updated.address,
      },
    },
  });

  return updated;
}

export async function deleteBusiness(userId: string, businessId: string) {
  const existing = await verifyBusinessOwnership(userId, businessId);

  if (!existing)
    throw new AppError(404, UMKM_ERROR_MESSAGES.BUSINESS_NOT_FOUND);

  await prisma.business.update({
    where: { id: businessId },
    data: { deletedAt: new Date() },
  });

  await prisma.inventoryItem.updateMany({
    where: { businessId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.BUSINESS_DELETED,
      entity: "Business",
      entityId: existing.id,
      before: {
        name: existing.name,
      },
    },
  });

  return { message: "Bisnis berhasil dihapus", id: businessId };
}

export async function getBusinessStats(userId: string, businessId: string) {
  await verifyBusinessOwnership(userId, businessId);

  const [inventoryStats, transactionStats] = await Promise.all([
    prisma.inventoryItem.aggregate({
      where: { businessId, deletedAt: null },
      _count: true,
      _sum: { quantity: true },
    }),

    prisma.businessTransaction.groupBy({
      by: ["type"],
      where: { businessId, deletedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const incomeStat = transactionStats.find((s) => s.type === "income");
  const expenseStat = transactionStats.find((s) => s.type === "expense");

  const totalIncome = incomeStat?._sum.amount || 0;
  const totalExpense = expenseStat?._sum.amount || 0;

  return {
    inventory: {
      totalItems: inventoryStats._count || 0,
      totalQuantity: inventoryStats._sum.quantity || 0,
    },
    transactions: {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      incomeCount: incomeStat?._count || 0,
      expenseCount: expenseStat?._count || 0,
    },
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