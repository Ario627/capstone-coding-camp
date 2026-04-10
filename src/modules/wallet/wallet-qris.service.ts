import { processWalletTransaction } from "./wallet-transaction.service.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { WALLET_LIMITS } from "./wallet.constant.js";
import type { QRISPaymentInput, QRISPaymentResult } from "./wallet.types.js";
import type { BankTransferInput, BankTransferResult } from "./wallet.types.js";

function generateReceiptNumber(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function processQRISPayment(
  userId: string,
  input: QRISPaymentInput,
): Promise<QRISPaymentResult> {
  if (
    input.amount < WALLET_LIMITS.MIN_TRANSACTION ||
    input.amount > WALLET_LIMITS.MAX_TRANSACTION
  ) {
    throw new AppError(400, "Nominal pembayaran tidak valid");
  }

  const result = await processWalletTransaction({
    userId,
    type: "PAYMENT",
    amount: input.amount,
    description: `Pembayaran QRIS - ${input.merchantName}`,
    metadata: {
      qrData: input.qrData,
      merchantName: input.merchantName,
      merchantId: input.merchantId,
      category: "QRIS",
    },
  });

  const receiptNumber = generateReceiptNumber("QRIS");

  return {
    transactionId: result.transactionId,
    walletTransactionId: result.walletTransactionId,
    amount: input.amount,
    merchantName: input.merchantName,
    merchantId: input.merchantId,
    receiptNumber,
    status: "COMPLETED",
    message: `Pembayaran QRIS ke ${input.merchantName} berhasil`,
  };
}

export async function processBankTransfer(
  userId: string,
  input: BankTransferInput,
): Promise<BankTransferResult> {
  if (
    input.amount < WALLET_LIMITS.MIN_TRANSACTION ||
    input.amount > WALLET_LIMITS.MAX_TRANSACTION
  ) {
    throw new AppError(400, "Nominal transfer tidak valid");
  }

  const result = await processWalletTransaction({
    userId,
    type: "PAYMENT",
    amount: input.amount,
    description:
      input.note ?? `Transfer ke ${input.bankName} - ${input.accountName}`,
    metadata: {
      bankCode: input.bankCode,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      category: "BANK_TRANSFER",
    },
  });

  const receiptNumber = generateReceiptNumber("TRF");

  return {
    transactionId: result.transactionId,
    walletTransactionId: result.walletTransactionId,
    amount: input.amount,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountName: input.accountName,
    receiptNumber,
    status: "COMPLETED",
    message: `Transfer ke ${input.bankName} - ${input.accountName} berhasil`,
  };
}
