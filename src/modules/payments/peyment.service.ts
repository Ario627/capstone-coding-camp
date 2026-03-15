import { Decimal } from "decimal.js";
import { v4 as uuidv4 } from "uuid";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.config.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { encryptData, decryptData } from "../../common/utils/crypto.util.js";
import type { InitiatePaymentInput, WebhookInput } from "./payment.schema.js";
import type { PaymentStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<string, PaymentStatus[]> = {
  PENDING: ["PROCESSING", "FAILED", "EXPIRED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
  EXPIRED: [],
};

function isValidTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function initiatePayment(userId: string, dto: InitiatePaymentInput) {
  const external = `fg_pay_${uuidv4().replace(/-/g, "").slice(0, 20)}`; //JUJUR BINGUNG INI NULIS APAAN WKWKWWK
  const amount = new Decimal(dto.amount).toFixed(2);

  const payment = await prisma.paymentTransaction.create({
    data: {
      userId,
      externalId: external,
      amount,
      method: dto.method,
      description: dto.description ?? null,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "PAYMENT_INITIATED",
      entity: "PaymentTransaction",
      entityId: payment.id,
      after: {
        external,
        amount: payment.amount.toString(),
        method: payment.method,
        status: payment.status,
      } as object,
    },
  });

  return {
    paymentId: payment.id,
    external,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    expiresAt: payment.expiresAt,
    paymentUrl: `https://pay.fingrow.id/checkout/${external}`,
  };
}

export async function getPaymentHistory(userId: string) {
  return prisma.paymentTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      externalId: true,
      amount: true,
      currency: true,
      method: true,
      status: true,
      description: true,
      paidAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}