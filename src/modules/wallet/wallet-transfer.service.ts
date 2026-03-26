import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import {
  WALLET_LIMITS,
  WALLET_TRANSACTION_MESSAGES,
} from "./wallet.constant.js";
import type { Prisma } from "@prisma/client";

export interface TransferInput {
  senderId: string;
  recipientId: string;
  amount: number;
  note?: string;
}

export interface TransferResult {
  senderTransactionId: string;
  recipientTransactionId: string;
  amount: number;
  status: "COMPLETED";
  recipientId: string;
}

export async function processTransfer(input: TransferInput): Promise<TransferResult> {
    const { senderId, recipientId, amount, note } = input;

    if(senderId === recipientId) {
        throw new AppError(400, "Cannot transfer to self");
    }

    if (
      amount < WALLET_LIMITS.MIN_TRANSACTION ||
      amount > WALLET_LIMITS.MAX_TRANSACTION
    ) {
      throw new AppError(400, WALLET_TRANSACTION_MESSAGES.INVALID_AMOUNT);
    }

    return await prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUnique({
        where: { id: senderId },
        select: { id: true, walletBalance: true },
      });

      if (!sender) {
        throw new AppError(404, WALLET_TRANSACTION_MESSAGES.USER_NOT_FOUND);
      }

      if (sender.walletBalance < amount) {
        throw new AppError(
          400,
          WALLET_TRANSACTION_MESSAGES.INSUFFICIENT_BALANCE,
        );
      }

      const recipient = await tx.user.findUnique({
        where: { id: recipientId },
        select: { id: true, walletBalance: true },
      });

      if (!recipient) {
        throw new AppError(
          404,
          WALLET_TRANSACTION_MESSAGES.RECIPIENT_NOT_FOUND,
        );
      }

      const senderBalanceAfter = sender.walletBalance - amount;
      const recipientBalanceAfter = recipient.walletBalance + amount;

      await tx.user.update({
        where: { id: senderId },
        data: { walletBalance: senderBalanceAfter },
      });

      await tx.user.update({
        where: { id: recipientId },
        data: { walletBalance: recipientBalanceAfter },
      });

      const senderTransaction = await tx.transaction.create({
        data: {
          userId: senderId,
          amount,
          type: "expense",
          category: "Transfer Keluar",
          description: note ?? "Transfer keluar",
        },
      });

      const recipientTransaction = await tx.transaction.create({
        data: {
          userId: recipientId,
          amount,
          type: "income",
          category: "Transfer Masuk",
          description: note ?? "Transfer masuk",
        },
      });

      const senderWalletTx = await tx.walletTransaction.create({
        data: {
          userId: senderId,
          transactionId: senderTransaction.id,
          type: "TRANSFER_OUT",
          amount,
          balanceBefore: sender.walletBalance,
          balanceAfter: senderBalanceAfter,
          status: "COMPLETED",
          description: note ?? "Transfer keluar",
          recipientUserId: recipientId,
        },
      });

      const recipientWalletTx = await tx.walletTransaction.create({
        data: {
          userId: recipientId,
          transactionId: recipientTransaction.id,
          type: "TRANSFER_IN",
          amount,
          balanceBefore: recipient.walletBalance,
          balanceAfter: recipientBalanceAfter,
          status: "COMPLETED",
          description: note ?? "Transfer masuk",
          recipientUserId: senderId,
        },
      });

      await tx.auditLog.createMany({
        data: [
          {
            userId: senderId,
            action: "WALLET_TRANSFER_OUT",
            entity: "WalletTransaction",
            entityId: senderWalletTx.id,
            after: { amount, recipientId, note } as Prisma.InputJsonValue,
          },
          {
            userId: recipientId,
            action: "WALLET_TRANSFER_IN",
            entity: "WalletTransaction",
            entityId: recipientWalletTx.id,
            after: { amount, senderId, note } as Prisma.InputJsonValue,
          },
        ],
      });

      return {
        senderTransactionId: senderWalletTx.id,
        recipientTransactionId: recipientWalletTx.id,
        amount,
        status: "COMPLETED",
        recipientId,
      };
    });
}