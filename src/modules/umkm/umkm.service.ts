import Decimal from "decimal.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
  CreateInventoryInput,
  UpdateInventoryInput
} from "./umkm.schema.js";

export async function createBusiness(userId: string, dto: CreateBusinessInput) {
  
}