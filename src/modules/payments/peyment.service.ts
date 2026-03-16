import { Decimal } from "decimal.js";
import { v4 as uuidv4 } from "uuid";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.config.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type { InitiatePaymentInput, WebhookInput } from "./payment.schema.js";
import type { PaymentStatus, Prisma } from "@prisma/client";


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

export async function handlePaymentWebhook(signature: string | undefined, body: Record<string, unknown>) {
  if (!signature) throw new AppError(401, "Missing signature");

  const secret = env().PAYMENT_WEBHOOK_SECRET;
  const expected = createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");

  const sigbuf = Buffer.from(signature, "utf-8");
  const expbuf = Buffer.from(expected, "utf-8");

  if(sigbuf.length !== expbuf.length || !timingSafeEqual(sigbuf, expbuf)) {
    throw new AppError(403, "Invalid signature");
  }

  const externalId = body["external_id"] as string;
  const status = body["status"] as string;
  
  if (!externalId || !status) throw new AppError(400, "Invalid payload");

  const payment = await prisma.paymentTransaction.findUnique({ where:  {externalId}});
  if(!payment) throw new AppError(404, "Payment not found");

  const statusMap: Record<string, "COMPLETED" | "PROCESSING" | "EXPIRED" | "FAILED" | "REFUNDED"> = {
    PAID: "COMPLETED",
    SETTLED: "COMPLETED",
    EXPIRED: "EXPIRED",
    FAILED: "FAILED",
    REFUNDED: "REFUNDED",
  }
  const mapped = statusMap[status.toUpperCase()] ?? "PROCESSING";

  const updated = await prisma.paymentTransaction.update({
    where: { externalId },
    data: {
      status: mapped,
      webhookPayload: body as Prisma.InputJsonValue,
      paidAt: mapped === "COMPLETED" ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: payment.userId,
      action: "PAYMENT_WEBHOOK",
      entity: "PaymentTransaction",
      entityId: payment.id,
      before: { status: payment.status } as object,
      after: { status: mapped, webhookStatus: status } as object,
    },
  });

  return {received: true, paymentId: updated.id, status: mapped};
}

export async function getPayment(userId: string, paymentId: string) {
  const payment = await prisma.paymentTransaction.findFirst({
    where: { id: paymentId, userId },
  });
  if (!payment) throw new AppError(404, "Payment tidak ditemukan");
  return payment;
}