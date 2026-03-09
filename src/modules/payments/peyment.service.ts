import Decimal from "decimal.js";
import { v4 as uuidv4 } from "uuid";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type z from "zod";
import type { initiatePaymentSchema } from "./payment.schema.js";

type IP = z.infer<typeof initiatePaymentSchema>;

export async function initiatePayment(uuid: string, d: IP) {
  const eid = `fg_pay_${uuidv4().replace(/-/g, '').slice(0, 20)}`;

  const p = await prisma.
}
