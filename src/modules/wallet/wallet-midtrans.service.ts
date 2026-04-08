import { createHash, timingSafeEqual } from "node:crypto";
import { Decimal } from "decimal.js";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.config.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import {
  WALLET_LIMITS,
  MIDTRANS_TRANSACTION_STATUS_MAP,
  extractPaymentMethodInfo,
} from "./wallet.constant.js";
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
  userId: string,
): Promise<{ token: string; redirectUrl: string }> {
  const isProduction = env().MIDTRANS_IS_PRODUCTION;
  const serverKey = env().MIDTRANS_SERVER_KEY;
  const authString = Buffer.from(serverKey + ":").toString("base64");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });

  const userName =
    user?.fullName || user?.email?.split("@")[0] || "FinGrow User";
  const userEmail = user?.email || "user@fingrow.id";

  const requestBody = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    item_details: [
      {
        id: `TOPUP-${orderId}`,
        price: amount,
        quantity: 1,
        name: "Top Up Saldo FinGrow",
        category: "TOP_UP",
        merchant_name: "FinGrow",
      },
    ],
    customer_details: {
      first_name: userName.split(" ")[0] || "User",
      last_name: userName.split(" ").slice(1).join(" ") || "",
      email: userEmail,
    },
    enabled_payments: [
      "bank_transfer",
      "bca_va",
      "bni_va",
      "bri_va",
      "mandiri_va",
      "echannel",
      "gopay",
      "shopeepay",
      "qris",
      "dana",
    ],
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
      return { token: "", redirectUrl: "" };
    }

    const data = (await response.json()) as {
      token?: string;
      redirect_url?: string;
    };
    return {
      token: data.token ?? "",
      redirectUrl: data.redirect_url ?? "",
    };
  } catch (error) {
    console.error("Failed to create Midtrans snap token:", error);
    return { token: "", redirectUrl: "" };
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

  const orderId = generateOrderId(userId);

  const dbResult = await prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.paymentTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existing) {
        if (existing.userId !== userId) {
          throw new AppError(409, "Idempotency key conflict");
        }
        throw new AppError(
          400,
          "Transaksi dengan Idempotency Key ini sudah diproses!",
        );
      }
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user) throw new AppError(404, "User not found");

    const paymentTx = await tx.paymentTransaction.create({
      data: {
        userId,
        externalId: orderId,
        idempotencyKey: input.idempotencyKey ?? null,
        amount: new Decimal(input.amount),
        method: input.method,
        status: "PENDING",
        description: "Top Up Saldo",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        amount: input.amount,
        type: "income",
        category: "Top Up Saldo",
        description: "Top Up Saldo (Pending)",
      },
    });

    const walletTx = await tx.walletTransaction.create({
      data: {
        userId,
        paymentTransactionId: paymentTx.id,
        transactionId: transaction.id,
        type: "TOP_UP",
        amount: input.amount,
        balanceBefore: user.walletBalance,
        balanceAfter: user.walletBalance,
        status: "PENDING",
        description: "Top Up Saldo",
        referenceId: orderId,
        metadata: { method: input.method },
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "TOP_UP_INITIATED",
        entity: "WalletTransaction",
        entityId: walletTx.id,
        after: {
          orderId,
          amount: input.amount,
          status: "PENDING",
        } as Prisma.InputJsonValue,
      },
    });

    return { paymentTx, walletTx };
  });

  const { token, redirectUrl } = await createMidtransSnapToken(
    orderId,
    input.amount,
    userId,
  );

  if (!token) {
    throw new AppError(
      500,
      "Gagal mendapatkan token dari Midtrans. Cek terminal untuk detail error!",
    );
  }

  return {
    paymentId: dbResult.paymentTx.id,
    orderId,
    snapToken: token,
    redirectUrl,
    amount: input.amount,
    expiresAt: dbResult.paymentTx.expiresAt!,
    status: "PENDING",
    walletTransactionId: dbResult.walletTx.id,
  };
}

async function handleSuccessfulPayment(
  paymentTx: {
    id: string;
    userId: string;
    amount: Decimal;
    externalId: string;
  },
  notification: MidtransNotification,
): Promise<{ received: boolean; paymentId: string; status: string }> {
  const paymentMethodInfo = extractPaymentMethodInfo(notification);

  return await prisma.$transaction(async (tx) => {
    const users = await tx.$queryRaw<{ id: string; walletBalance: number }[]>`
      SELECT id, wallet_balance AS "walletBalance" FROM users WHERE id = ${paymentTx.userId} FOR UPDATE
    `;

    if (!users || users.length === 0) {
      throw new AppError(404, "User not found");
    }

    const currentUser = users[0]!;

    const walletTx = await tx.walletTransaction.findFirst({
      where: { paymentTransactionId: paymentTx.id, deletedAt: null },
    });

    if (!walletTx) {
      throw new AppError(404, "Wallet transaction not found");
    }

    if (walletTx.balanceBefore !== currentUser.walletBalance) {
      console.warn(
        `Balance mismatch for user ${paymentTx.userId}: expected ${walletTx.balanceBefore}, actual ${currentUser.walletBalance}`,
      );
    }

    const newBalance = currentUser.walletBalance + paymentTx.amount.toNumber();

    await tx.user.update({
      where: { id: paymentTx.userId },
      data: { walletBalance: newBalance },
    });

    await tx.walletTransaction.update({
      where: { id: walletTx.id },
      data: {
        status: "COMPLETED",
        balanceAfter: newBalance,
        paymentMethod: paymentMethodInfo.paymentMethod,
        paymentMethodName: paymentMethodInfo.paymentMethodName,
      },
    });

    await tx.transaction.update({
      where: { id: walletTx.transactionId },
      data: { description: "Top Up Saldo" },
    });

    await tx.paymentTransaction.update({
      where: { id: paymentTx.id },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
        webhookPayload: notification as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: paymentTx.userId,
        action: "TOP_UP_COMPLETED",
        entity: "WalletTransaction",
        entityId: walletTx.id,
        before: {
          status: "PENDING",
          balance: walletTx.balanceBefore,
        } as Prisma.InputJsonValue,
        after: {
          status: "COMPLETED",
          balance: newBalance,
          orderId: paymentTx.externalId,
          paymentMethod: paymentMethodInfo.paymentMethod,
        } as Prisma.InputJsonValue,
      },
    });

    return { received: true, paymentId: paymentTx.id, status: "COMPLETED" };
  });
}

async function handleFailedPayment(
  paymentTx: { id: string; userId: string; externalId: string },
  notification: MidtransNotification,
  mappedStatus: "FAILED" | "EXPIRED" | "CANCELLED",
): Promise<{ received: boolean; paymentId: string; status: string }> {
  return await prisma.$transaction(async (tx) => {
    const walletTx = await tx.walletTransaction.findFirst({
      where: { paymentTransactionId: paymentTx.id, deletedAt: null },
    });

    if (!walletTx) {
      throw new AppError(404, "Wallet transaction not found");
    }

    const walletStatus =
      mappedStatus === "EXPIRED" ? "CANCELLED" : mappedStatus;

    await tx.walletTransaction.update({
      where: { id: walletTx.id },
      data: { status: walletStatus },
    });

    await tx.transaction.update({
      where: { id: walletTx.transactionId },
      data: { description: `Top Up Saldo - ${mappedStatus}` },
    });

    await tx.paymentTransaction.update({
      where: { id: paymentTx.id },
      data: {
        status: mappedStatus as PaymentStatus,
        failureReason: notification.status_message ?? mappedStatus,
        webhookPayload: notification as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: paymentTx.userId,
        action: "TOP_UP_FAILED",
        entity: "WalletTransaction",
        entityId: walletTx.id,
        before: { status: "PENDING" } as Prisma.InputJsonValue,
        after: {
          status: mappedStatus,
          orderId: paymentTx.externalId,
        } as Prisma.InputJsonValue,
      },
    });

    return { received: true, paymentId: paymentTx.id, status: mappedStatus };
  });
}

export async function handleMidtransCallback(
  notification: MidtransNotification,
  options?: { isSimulate?: boolean },
): Promise<{
  received: boolean;
  paymentId?: string;
  status?: string;
  duplicate?: boolean;
}> {
  if (options?.isSimulate !== true) {
    const isValid = verifyMidtransSignature(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
      notification.signature_key,
    );

    if (!isValid) {
      throw new AppError(401, "Invalid signature");
    }
  }

  const paymentTx = await prisma.paymentTransaction.findUnique({
    where: { externalId: notification.order_id },
  });

  if (!paymentTx) {
    throw new AppError(404, "Payment not found");
  }

  if (paymentTx.status !== "PENDING" && paymentTx.status !== "PROCESSING") {
    return {
      received: true,
      duplicate: true,
      paymentId: paymentTx.id,
      status: paymentTx.status,
    };
  }

  const mappedStatus =
    MIDTRANS_TRANSACTION_STATUS_MAP[
      notification.transaction_status.toLowerCase()
    ];
  const status = mappedStatus ?? "PROCESSING";

  if (status === "COMPLETED") {
    return await handleSuccessfulPayment(paymentTx, notification);
  } else if (["FAILED", "EXPIRED", "CANCELLED"].includes(status)) {
    return await handleFailedPayment(
      paymentTx,
      notification,
      status as "FAILED" | "EXPIRED" | "CANCELLED",
    );
  }

  await prisma.paymentTransaction.update({
    where: { id: paymentTx.id },
    data: {
      status: "PROCESSING",
      webhookPayload: notification as unknown as Prisma.InputJsonValue,
    },
  });

  return { received: true, paymentId: paymentTx.id, status: "PROCESSING" };
}

export async function simulateWebhook(
  orderId: string,
  status: "success" | "failed",
): Promise<{ received: boolean; paymentId?: string; status?: string }> {
  if (env().NODE_ENV === "production") {
    throw new AppError(403, "Simulate only available in development");
  }

  const paymentTx = await prisma.paymentTransaction.findUnique({
    where: { externalId: orderId },
  });

  if (!paymentTx) {
    throw new AppError(404, "Payment not found");
  }

  const notification: MidtransNotification = {
    order_id: orderId,
    transaction_status: status === "success" ? "settlement" : "deny",
    status_code: status === "success" ? "200" : "500",
    gross_amount: paymentTx.amount.toString(),
    signature_key: "simulate",
    transaction_id: `SIM-${Date.now()}`,
    payment_type: "simulation",
    transaction_time: new Date().toISOString(),
    status_message: status === "success" ? "Success" : "Failed",
  };

  return await handleMidtransCallback(notification, { isSimulate: true });
}

export { verifyMidtransSignature };
