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
  recipientUserId?: string;
  metadata?: Record<string, unknown>;
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
  if (input.type === "TOP_UP") {
    throw new AppError(
      400,
      "TOP_UP must use initiateTopUp flow, not processWalletTransaction",
    );
  }

  return await prisma.$transaction(async (tx) => {
    const users = await tx.$queryRaw<{ id: string; walletBalance: number }[]>`
      SELECT id, wallet_balance FROM users WHERE id = ${input.userId} FOR UPDATE
    `;

    if (!users || users.length === 0) {
      throw new AppError(404, "User not found");
    }

    const user = users[0]!;
    const balanceBefore = user.walletBalance;
    let balanceAfter: number;
    let transactionType: "income" | "expense";

    if (input.type === "TRANSFER_IN" || input.type === "REFUND") {
      balanceAfter = balanceBefore + input.amount;
      transactionType = "income";
    } else {
      if (balanceBefore < input.amount) {
        throw new AppError(400, "Insufficient balance");
      }
      balanceAfter = balanceBefore - input.amount;
      transactionType = "expense";
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
        transactionId: transaction.id,
        type: input.type,
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        status: "COMPLETED",
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
          status: "COMPLETED",
          type: input.type,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      walletTransactionId: walletTransaction.id,
      transactionId: transaction.id,
      balanceBefore,
      balanceAfter,
      status: "COMPLETED",
    };
  });
}
