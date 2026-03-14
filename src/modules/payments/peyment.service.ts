import { Decimal } from "decimal.js";
import { v4 as uuidv4 } from "uuid";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.config.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type { InitiatePaymentInput } from "./payment.schema.js";

export async function initiatePayment(userId: string, dto: InitiatePaymentInput) {
  const external = `fg_pay_${uuidv4().replace(/-/g, "").slice(0, 20)}`; //JUJUR BINGUNG INI NULIS APAAN WKWKWWK
  const amount = new Decimal(dto.amount).toFixed(2);

  const 
}