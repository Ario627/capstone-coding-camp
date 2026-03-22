import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { UMKM_AUDIT_ACTIONS, UMKM_ERROR_MESSAGES } from "./umkm.constant.js";
import { Decimal } from "decimal.js";
import type {
  CreateBusinessTransactionInput,
  UpdateBusinessTransactionInput,
  BusinessTransactionListQuery,
} from "./umkm.schema.js";
//Helper 1
import { verifyBusinessOwnership } from "./business.service.js";
import { da } from "zod/locales";

//Helper 2
async function verifyTransactionOwnership(
  userId: string,
  businessId: string,
  transactionId: string,
) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, userId, deletedAt: null },
    select: { id: true },
  });

  if (!business)
    throw new AppError(404, UMKM_ERROR_MESSAGES.BUSINESS_NOT_FOUND);

  const transaction = await prisma.businessTransaction.findFirst({
    where: { id: transactionId, businessId, deletedAt: null },
  });

  if (!transaction)
    throw new AppError(404, UMKM_ERROR_MESSAGES.TRANSACTION_NOT_FOUND);

  return transaction;
}

//Helper 3 parse tanggal
function parseDate(dateInput: Date | string | undefined): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime()))
    throw new AppError(400, UMKM_ERROR_MESSAGES.INVALID_DATE_RANGE);

  return parsed;
}

//Create transaction
export async function createBusinessTransaction(
  userId: string,
  businessId: string,
  dto: CreateBusinessTransactionInput,
) {
  await verifyBusinessOwnership(userId, businessId);

  if (dto.amount <= 0) {
    throw new AppError(400, UMKM_ERROR_MESSAGES.INVALID_AMOUNT);
  }

  const transactionDate = parseDate(dto.transactionDate);

  const transaction = await prisma.businessTransaction.create({
    data: {
      businessId,
      type: dto.type,
      amount: dto.amount,
      category: dto.category,
      description: dto.description,
      transactionDate,
      paymentMethod: dto.paymentMethod ?? null,
      notes: dto.notes ?? null,
      receiptUrl: dto.receiptUrl ?? null,
    },
    select: {
      id: true,
      businessId: true,
      type: true,
      amount: true,
      category: true,
      description: true,
      transactionDate: true,
      paymentMethod: true,
      notes: true,
      receiptUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.BUSINESS_TX_CREATED,
      entity: "BusinessTransaction",
      entityId: transaction.id,
      after: {
        businessId,
        type: dto.type,
        amount: dto.amount,
        category: dto.category,
      },
    },
  });

  return transaction;
}

//List nya
export async function listBusinessTransactions(
  userId: string,
  businessId: string,
  query: BusinessTransactionListQuery,
) {
  // Verifikasi
  await verifyBusinessOwnership(userId, businessId);

  const {
    page = 1,
    limit = 10,
    type,
    category,
    startDate,
    endDate,
    paymentMethod,
  } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    businessId,
    deletedAt: null,
  };

  if (type) {
    where.type = type;
  }

  if (category) {
    where.category = { contains: category, mode: "insensitive" };
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) {
      (where.transactionDate as Record<string, unknown>).gte = new Date(
        startDate,
      );
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.transactionDate as Record<string, unknown>).lte = end;
    }
  }

  const [total, items] = await Promise.all([
    prisma.businessTransaction.count({ where }),
    prisma.businessTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { transactionDate: "desc" },
      select: {
        id: true,
        businessId: true,
        type: true,
        amount: true,
        category: true,
        description: true,
        transactionDate: true,
        paymentMethod: true,
        notes: true,
        receiptUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items,
  };
}

export async function getBusinessTransaction(
  userId: string,
  businessId: string,
  transactionId: string,
) {
  const transaction = await verifyTransactionOwnership(
    userId,
    businessId,
    transactionId,
  );
  return transaction;
}

export async function updateBusinessTransaction(userId: string, businessId: string, transactionId: string, dto: UpdateBusinessTransactionInput) {
    const existing = await verifyTransactionOwnership(userId, businessId, transactionId);

    if(dto.amount !== undefined && dto.amount <= 0) throw new AppError(400, UMKM_ERROR_MESSAGES.INVALID_AMOUNT);

    const {transactionDate, ...rest} = dto;

    const data: Record<string, any> = Object.fromEntries(
        Object.entries(rest).filter(([_, value]) => value !== undefined)
    )

    if (transactionDate !== undefined) {
        data.transactionDate = parseDate(transactionDate);
    }

    const updated = await prisma.businessTransaction.update({
      where: { id: transactionId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: UMKM_AUDIT_ACTIONS.BUSINESS_TX_UPDATED,
        entity: "BusinessTransaction",
        entityId: updated.id,
        before: {
          type: existing.type,
          amount: existing.amount,
          category: existing.category,
        },
        after: {
          type: updated.type,
          amount: updated.amount,
          category: updated.category,
        },
      },
    });

    return updated;
}

export async function deleteBusinessTransaction(
  userId: string,
  businessId: string,
  transactionId: string,
) {
  // Verifikasi 
  const existing = await verifyTransactionOwnership(
    userId,
    businessId,
    transactionId,
  );
  await prisma.businessTransaction.update({
    where: { id: transactionId },
    data: { deletedAt: new Date() },
  });


  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.BUSINESS_TX_DELETED,
      entity: "BusinessTransaction",
      entityId: existing.id,
      before: {
        type: existing.type,
        amount: existing.amount,
        category: existing.category,
      },
    },
  });

  return { message: "Transaksi berhasil dihapus", id: transactionId };
}


export async function getBusinessTransactionSummary(
  userId: string,
  businessId: string,
  startDate?: string,
  endDate?: string,
) {
  await verifyBusinessOwnership(userId, businessId);

  const transactionDate =
    startDate || endDate
      ? {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && {
            lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
          }),
        }
      : undefined;

  const whereBase = {
    businessId,
    deletedAt: null,
    ...(transactionDate && { transactionDate }),
  };

  const [statsByType, statsByCategory, recentTransactions] = await Promise.all([
    // Ambil total income dan expense
    prisma.businessTransaction.groupBy({
      by: ["type"],
      where: whereBase,
      _sum: { amount: true },
      _count: true,
    }),
    // Ambil kategori income dan expense
    prisma.businessTransaction.groupBy({
      by: ["type", "category"],
      where: whereBase,
      _sum: { amount: true },
      _count: true,
    }),
    // Ambil transaksi terakhir
    prisma.businessTransaction.findMany({
      where: whereBase,
      orderBy: { transactionDate: "desc" },
      take: 10,
    }),
  ]);

  const getStat = (type: string) => statsByType.find((s) => s.type === type);
  const totalIncome = getStat("income")?._sum.amount || 0;
  const totalExpense = getStat("expense")?._sum.amount || 0;

  // 4. Helper untuk memisah dan mengurutkan kategori 
  const formatCategory = (type: string) =>
    statsByCategory
      .filter((c) => c.type === type)
      .map((c) => ({
        category: c.category,
        total: c._sum.amount || 0,
        count: c._count,
      }))
      .sort((a, b) => b.total - a.total); // Urutkan dari yang terbesar

  return {
    summary: {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      incomeCount: getStat("income")?._count || 0,
      expenseCount: getStat("expense")?._count || 0,
      profitMargin:
        totalIncome > 0
          ? Number(
              (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(2),
            )
          : 0,
    },
    incomeByCategory: formatCategory("income"),
    expenseByCategory: formatCategory("expense"),
    recentTransactions,
  };
}


// monthly trend 
export async function getBusinessTransactionTrend(
  userId: string,
  businessId: string,
  months: number = 6
) {
  await verifyBusinessOwnership(userId, businessId);

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
      transactionDate: true,
    },
    orderBy: { transactionDate: "asc" },
  });

  //group by month
  const monthlyData: Record<string, { income: number; expense: number }> = {};

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
  const trend = sortedMonths.map((month) => {
    const data = monthlyData[month]!;
    return {
      month,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    };
  });

  return {
    period: `${months} bulan terakhir`,
    months: sortedMonths,
    trend,
  };
}