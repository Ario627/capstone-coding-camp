import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { PAGINATION_DEFAULTS } from "../../common/constants/index.js";
import type {
  WalletTransactionType,
  WalletTransactionStatus,
} from "@prisma/client";

export interface WalletBalanceResult {
  balance: number;
  currency: string;
}

export interface WalletHistoryItem {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
  description: string | null;
  referenceId: string | null;
  createdAt: Date;
}

export interface WalletHistoryResult {
  page: number;
  limit: number;
  total: number;
  items: WalletHistoryItem[];
}

export async function getWalletBalance(
  userId: string,
): Promise<WalletBalanceResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });

  if (!user) throw new AppError(404, "User not found");

  return {
    balance: user.walletBalance,
    currency: "IDR",
  };
}

export async function getWalletHistory(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    type?: WalletTransactionType;
    status?: WalletTransactionStatus;
    startDate?: Date;
    endDate?: Date;
  } = {},
): Promise<WalletHistoryResult> {
  const page = options.page ?? PAGINATION_DEFAULTS.PAGE;
  const limit = Math.min(
    options.limit ?? PAGINATION_DEFAULTS.LIMIT,
    PAGINATION_DEFAULTS.MAX_LIMIT,
  );
  const skip = (page - 1) * limit;

  const where: {
    userId: string;
    deletedAt: null;
    type?: WalletTransactionType;
    status?: WalletTransactionStatus;
    createdAt?: { gte?: Date; lte?: Date };
  } = {
    userId,
    deletedAt: null,
  };

  if (options.type) {
    where.type = options.type;
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [total, items] = await Promise.all([
    prisma.walletTransaction.count({ where }),
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        status: true,
        description: true,
        referenceId: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    page,
    limit,
    total,
    items,
  };
}

export async function getWalletTransactionById(
  userId: string,
  transactionId: string,
): Promise<
  WalletHistoryItem & {
    recipientUserId?: string | null;
    metadata?: Record<string, unknown> | null;
  }
> {
  const transaction = await prisma.walletTransaction.findFirst({
    where: {
      id: transactionId,
      userId,
      deletedAt: null,
    },
    select: {
      id: true,
      type: true,
      amount: true,
      balanceBefore: true,
      balanceAfter: true,
      status: true,
      description: true,
      referenceId: true,
      recipientUserId: true,
      metadata: true,
      createdAt: true,
    },
  });

  if (!transaction) {
    throw new AppError(404, "Transaction not found");
  }

  return {
    ...transaction,
    metadata: transaction.metadata as Record<string, unknown> | null,
  };
}

export async function validateUserExists(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return !!user;
}

export * from "./wallet-transaction.service.js";
export * from "./wallet-transfer.service.js";
export * from "./wallet-midtrans.service.js";
export * from "./wallet-ppob.service.js";