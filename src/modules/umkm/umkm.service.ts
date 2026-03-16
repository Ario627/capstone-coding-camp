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
  const business = await prisma.business.create({
    data: {
      userId,
      name: dto.name,
      type: dto.type,
      description: dto.description ?? null,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "BUSINESS_CREATED",
      entity: "Business",
      entityId: business.id,
      after: { name: business.name, type: business.type } as object,
    },
  });

  return business;
}