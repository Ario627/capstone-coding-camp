import { createHash, timingSafeEqual } from "node:crypto";
import { Decimal } from "decimal.js";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.config.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import {
  WALLET_LIMITS,
  MIDTRANS_TRANSACTION_STATUS_MAP,
} from "./wallet.constant.js";
import {
  processWalletTransaction,
  updateWalletTransactionStatus,
} from "./wallet-transaction.service.js";
import type {
  TopUpInput,
  TopUpResult,
  MidtransNotification,
} from "./wallet.types.js";
import type { PaymentStatus, Prisma } from "@prisma/client";

function generateOrderId(userId: string): string {
  const timestamp = Date.now().toString();
  const random = uuidv4().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `WALLET-${timestamp}-${random}`;
}

function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  receivedSignature: string,
): boolean {
  const serverKey = env().MIDTRANS_SERVER_KEY;
  const expectedSignature = createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex");

  try {
    const received = Buffer.from(receivedSignature, "utf-8");
    const expected = Buffer.from(expectedSignature, "utf-8");

    if (received.length !== expected.length) return false;
    return timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

async function createMidtransSnapToken(
  orderId: string,
  amount: number,
): Promise<string> {
  const isProduction = env().MIDTRANS_IS_PRODUCTION;
  const serverKey = env().MIDTRANS_SERVER_KEY;
  const clientKey = env().MIDTRANS_CLIENT_KEY;

  const authString = Buffer.from(serverKey + ":").toString("base64");

  const requestBody = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    callbacks: {
      finish: `${env().FRONTEND_URL}/wallet/top-up/finish`,
      error: `${env().FRONTEND_URL}/wallet/top-up/error`,
    },
  };

  const baseUrl = isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Midtrans API error:", errorText);
      return "";
    }

    const data = (await response.json()) as {
      token?: string;
      redirect_url?: string;
    };
    return data.token ?? "";
  } catch (error) {
    console.error("Failed to create Midtrans snap token:", error);
    return "";
  }
}

export async function initiateTopUp(
  userId: string,
  input: TopUpInput,
): Promise<TopUpResult> {
  if (
    input.amount < WALLET_LIMITS.MIN_TOP_UP ||
    input.amount > WALLET_LIMITS.MAX_TOP_UP
  ) {
    throw new AppError(
      400,
      `Amount must be between ${WALLET_LIMITS.MIN_TOP_UP} and ${WALLET_LIMITS.MAX_TOP_UP}`,
    );
  }

  if (input.idempotencyKey) {
    const existing = await prisma.paymentTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existing) {
      if (existing.userId !== userId) {
        throw new AppError(409, "Idempotency key conflict");
      }

      if (existing.status === "COMPLETED") {
        throw new AppError(409, "Transaction already completed");
      }

      return {
        paymentId: existing.id,
        orderId: existing.externalId,
        snapToken: "",
        amount: existing.amount.toNumber(),
        expiresAt: existing.expiresAt!,
      };
    }
  }

  const orderId = generateOrderId(userId);

  const paymentTx = await prisma.paymentTransaction.create({
    data: {
      userId,
      externalId: orderId,
      idempotencyKey: input.idempotencyKey,
      amount: new Decimal(input.amount),
      method: input.method,
      status: "PENDING",
      description: "Top Up Saldo FinGrow Pay",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const result = await processWalletTransaction({
    userId,
    type: "TOP_UP",
    amount: input.amount,
    description: "Top Up Saldo",
    referenceId: orderId,
    paymentTransactionId: paymentTx.id,
    metadata: { method: input.method },
    initialStatus: "PENDING",
  });

  const snapToken = await createMidtransSnapToken(orderId, input.amount);

  return {
    paymentId: paymentTx.id,
    orderId,
    snapToken,
    amount: input.amount,
    expiresAt: paymentTx.expiresAt!,
  };
}

export async function handleMidtransCallback(
  notification: MidtransNotification,
): Promise<{ received: boolean; paymentId?: string; status?: string }> {
  const isValid = verifyMidtransSignature(
    notification.order_id,
    notification.status_code,
    notification.gross_amount,
    notification.signature_key,
  );

  if (!isValid) {
    throw new AppError(401, "Invalid signature");
  }

  const paymentTx = await prisma.paymentTransaction.findUnique({
    where: { externalId: notification.order_id },
  });

  if (!paymentTx) {
    throw new AppError(404, "Payment not found");
  }

  if (paymentTx.status === "COMPLETED") {
    return { received: true, duplicate: true } as {
      received: boolean;
      paymentId?: string;
      status?: string;
    };
  }

  const mappedStatus =
    MIDTRANS_TRANSACTION_STATUS_MAP[
      notification.transaction_status.toLowerCase()
    ];
  const status = mappedStatus ?? "PROCESSING";

  const walletTx = await prisma.walletTransaction.findFirst({
    where: { paymentTransactionId: paymentTx.id, deletedAt: null },
  });

  await prisma.$transaction(async (tx) => {
    const updateData: Prisma.PaymentTransactionUpdateInput = {
      status: status as PaymentStatus,
      webhookPayload: notification as unknown as Prisma.InputJsonValue,
    };

    if (status === "COMPLETED") {
      updateData.paidAt = new Date();
    }

    await tx.paymentTransaction.update({
      where: { id: paymentTx.id },
      data: updateData,
    });

    if (walletTx && status === "COMPLETED") {
      await tx.walletTransaction.update({
        where: { id: walletTx.id },
        data: {
          status: "COMPLETED",
          balanceAfter: walletTx.balanceBefore + walletTx.amount,
        },
      });
    } else if (
      walletTx &&
      (status === "FAILED" || status === "EXPIRED")
    ) {
      await tx.walletTransaction.update({
        where: { id: walletTx.id },
        data: { status: status === "EXPIRED" ? "CANCELLED" : status },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: paymentTx.userId,
        action: "MIDTRANS_CALLBACK",
        entity: "PaymentTransaction",
        entityId: paymentTx.id,
        before: { status: paymentTx.status } as Prisma.InputJsonValue,
        after: {
          status,
          orderId: notification.order_id,
          transactionStatus: notification.transaction_status,
        } as Prisma.InputJsonValue,
      },
    });
  });

  return { received: true, paymentId: paymentTx.id, status };
}

export { verifyMidtransSignature };