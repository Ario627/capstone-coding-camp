import Decimal from "decimal.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type z from "zod";
import type {
  createBusinessSchema,
  updateBusinessSchema,
  createInventoryItemSchema,
} from './umkm.schema.ts';

type CB = z.infer<typeof createBusinessSchema>
type UB = z.infer<typeof updateBusinessSchema>
type CII = z.infer<typeof createInventoryItemSchema>

export async function createBusiness(uid: string, d: CB) {
  return prisma.
}
