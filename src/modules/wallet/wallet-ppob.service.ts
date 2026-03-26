import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { PPOB_PRODUCTS, WALLET_LIMITS } from "./wallet.constant.js";
import { processWalletTransaction } from "./wallet-transaction.service.js";
import type { PPOBInput, PPOBResult } from "./wallet.types.js";

export function getPPOBProducts() {
  return PPOB_PRODUCTS.map((product) => ({
    code: product.code,
    name: product.name,
    category: product.category,
    provider: product.provider,
    amount: product.amount,
    fee: product.fee,
  }));
}

export function validatePPOBProduct(productCode: string) {
  return PPOB_PRODUCTS.find((p) => p.code === productCode);
}

export async function processPPOB(
  userId: string,
  input: PPOBInput,
): Promise<PPOBResult> {
  const product = validatePPOBProduct(input.productCode);

  if (!product) {
    throw new AppError(404, "Product not found");
  }

  if (input.amount !== product.amount) {
    throw new AppError(400, `Amount must be ${product.amount}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, walletBalance: true },
  });

  if (!user) throw new AppError(404, "user not found");

  if (user.walletBalance < input.amount) {
    throw new AppError(400, "Insufficient balance");
  }

  const result = await processWalletTransaction({
    userId,
    type: "PPOB",
    amount: input.amount,
    description: `${product.name} - ${input.targetNumber}`,
    metadata: {
      productCode: input.productCode,
      productName: product.name,
      targetNumber: input.targetNumber,
      provider: product.provider,
      category: product.category,
    },
  });

  const receiptNumber = `PPOB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return {
    transactionId: result.walletTransactionId,
    receiptNumber,
    productCode: input.productCode,
    targetNumber: input.targetNumber,
    amount: input.amount,
    status: "COMPLETED",
    message: `Pembayaran ${product.name} berhasil`,
  };
}

export function generateMockReceiptNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PPOB-${timestamp}-${random}`;
}