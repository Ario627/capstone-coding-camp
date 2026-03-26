import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { WALLET_TRANSACTION_CATEGORY_MAP } from "../../common/constants/index.js";
import type {
  WalletTransactionType,
  WalletTransactionStatus,
  Prisma,
} from "@prisma/client";

export interface ProcessWalletTransactionInput {
  userId: string;
  type: WalletTransactionType;
  amount: number;
  description?: string;
  referenceId?: string;
  paymentTransactionId?: string;
  recipientUserId?: string;
  metadata?: Record<string, unknown>;
  initialStatus?: WalletTransactionStatus;
}

export interface ProcessWalletTransactionResult {
  walletTransactionId: string;
  transactionId: string;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
}

export async function processWalletTransaction(
  input: ProcessWalletTransactionInput,
): Promise<ProcessWalletTransactionResult> {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, walletBalance: true },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const balanceBefore = user.walletBalance;
    let balanceAfter: number;
    let transactionType: "income" | "expense";
    let status: WalletTransactionStatus = input.initialStatus ?? "PROCESSING";

    switch (input.type) {
      case "TOP_UP":
      case "TRANSFER_IN":
      case "REFUND":
        balanceAfter = balanceBefore + input.amount;
        transactionType = "income";
        if (input.type === "TOP_UP") {
          status = input.initialStatus ?? "PENDING";
        } else {
          status = "COMPLETED";
        }
        break;

      case "PPOB":
      case "TRANSFER_OUT":
      case "WITHDRAWAL":
        if (balanceBefore < input.amount) {
          throw new AppError(400, "Insufficient balance");
        }
        balanceAfter = balanceBefore - input.amount;
        transactionType = "expense";
        status = "COMPLETED";
        break;

      default:
        throw new AppError(400, "Invalid transaction type");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { walletBalance: balanceAfter },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId: input.userId,
        amount: input.amount,
        type: transactionType,
        category: WALLET_TRANSACTION_CATEGORY_MAP[input.type] ?? "Other",
        description:
          input.description ??
          WALLET_TRANSACTION_CATEGORY_MAP[input.type] ??
          "",
      },
    });

    const walletTransaction = await tx.walletTransaction.create({
      data: {
        userId: input.userId,
        paymentTransactionId: input.paymentTransactionId ?? null,
        transactionId: transaction.id,
        type: input.type,
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        status,
        description: input.description ?? null,
        referenceId: input.referenceId ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        recipientUserId: input.recipientUserId ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: `WALLET_${input.type}`,
        entity: "WalletTransaction",
        entityId: walletTransaction.id,
        after: {
          amount: input.amount,
          balanceBefore,
          balanceAfter,
          status,
          type: input.type,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      walletTransactionId: walletTransaction.id,
      transactionId: transaction.id,
      balanceBefore,
      balanceAfter,
      status: walletTransaction.status,
    };
  });
}

export async function updateWalletTransactionStatus(
  walletTransactionId: string,
  newStatus: WalletTransactionStatus,
  additionalMetadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const walletTx = await tx.walletTransaction.findUnique({
      where: { id: walletTransactionId },
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        metadata: true,
      },
    });

    if (!walletTx) {
      throw new AppError(404, "Wallet transaction not found");
    }

    if (newStatus === "COMPLETED" && walletTx.status === "PENDING") {
      await tx.user.update({
        where: { id: walletTx.userId },
        data: { walletBalance: { increment: walletTx.amount } },
      });
    }

    const updateData: Prisma.WalletTransactionUpdateInput = {
      status: newStatus,
    };

    if (additionalMetadata) {
      updateData.metadata = {
        ...(walletTx.metadata as Record<string, unknown>),
        ...additionalMetadata,
      } as Prisma.InputJsonValue;
    }

    await tx.walletTransaction.update({
      where: { id: walletTransactionId },
      data: updateData,
    });

    await tx.auditLog.create({
      data: {
        userId: walletTx.userId,
        action: `WALLET_STATUS_UPDATE`,
        entity: "WalletTransaction",
        entityId: walletTransactionId,
        before: { status: walletTx.status } as Prisma.InputJsonValue,
        after: { status: newStatus } as Prisma.InputJsonValue,
      },
    });
  });
}