import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { UMKM_AUDIT_ACTIONS, UMKM_ERROR_MESSAGES } from "./umkm.constant.js";
import { Decimal } from "decimal.js";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
  BusinessListQuery,
} from "./umkm.schema.js";
import { getFinancialSummary } from "./umkm-report.service.js";

export async function verifyBusinessOwnership(
  userId: string,
  businessId: string,
) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      name: true,
      type: true,
      address: true,
      lat: true,
      lng: true,
      category: true,
    },
  });

  if (!business)
    throw new AppError(404, UMKM_ERROR_MESSAGES.BUSINESS_NOT_FOUND);

  if (business.userId !== userId)
    throw new AppError(403, UMKM_ERROR_MESSAGES.BUSINESS_UNAUTHORIZED);

  return business;
}

export async function createBusiness(userId: string, dto: CreateBusinessInput) {
  if (dto.lat !== undefined && dto.lat !== null)
    throw new AppError(400, UMKM_ERROR_MESSAGES.LAT_LNG_REQUIRED);

  if (dto.lng !== undefined && dto.lng !== null) {
    if (dto.lat === undefined || dto.lat === null) {
      throw new AppError(400, UMKM_ERROR_MESSAGES.LAT_LNG_REQUIRED);
    }
  }

  const business = await prisma.business.create({
    data: {
      userId,
      name: dto.name,
      type: dto.type,
      description: dto.description ?? null,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      category: dto.category ?? null,
    },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      address: true,
      phone: true,
      lat: true,
      lng: true,
      category: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  //Audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.BUSINESS_CREATED,
      entity: "Business",
      entityId: business.id,
      after: {
        name: business.name,
        type: business.type,
        category: business.category,
      },
    },
  });

  return business;
}

export async function listBusinesses(userId: string, query: BusinessListQuery) {
  const { page = 1, limit = 10, search, category, isActive } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    userId,
    deletedAt: null,
  };

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }

  // Category filter
  if (category) {
    where.category = category;
  }

  // Active status filter
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [total, items] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        address: true,
        phone: true,
        lat: true,
        lng: true,
        category: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            inventoryItems: { where: { deletedAt: null } },
            businessTransactions: { where: { deletedAt: null } },
          },
        },
      },
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: items.map((item) => ({
      ...item,
      inventoryCount: item._count.inventoryItems,
      transactionCount: item._count.businessTransactions,
    })),
  };
}

export async function getBusiness(userId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      name: true,
      type: true,
      description: true,
      address: true,
      phone: true,
      lat: true,
      lng: true,
      category: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          inventoryItems: { where: { deletedAt: null } },
          businessTransactions: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!business) {
    throw new AppError(404, UMKM_ERROR_MESSAGES.BUSINESS_NOT_FOUND);
  }

  if (business.userId !== userId) {
    throw new AppError(403, UMKM_ERROR_MESSAGES.BUSINESS_UNAUTHORIZED);
  }

  const { _count, ...businessData } = business;

  return {
    ...businessData,
    inventoryCount: _count.inventoryItems,
    transactionCount: _count.businessTransactions,
  };
}

export async function updateBusiness(
  userId: string,
  businessId: string,
  dto: UpdateBusinessInput,
) {
  const existing = await verifyBusinessOwnership(userId, businessId);

  if (dto.lat !== undefined && dto.lat !== null) {
    const lngValue = dto.lng ?? existing.lng;
    if (lngValue === null || lngValue === undefined) {
      throw new AppError(400, UMKM_ERROR_MESSAGES.LAT_LNG_REQUIRED);
    }
  }
  if (dto.lng !== undefined && dto.lng !== null) {
    const latValue = dto.lat ?? existing.lat;
    if (latValue === null || latValue === undefined) {
      throw new AppError(400, UMKM_ERROR_MESSAGES.LAT_LNG_REQUIRED);
    }
  }

  const data = Object.fromEntries(
    Object.entries(dto).filter(([_, value]) => value !== undefined),
  );

  const updated = await prisma.business.update({
    where: { id: businessId },
    data,
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      address: true,
      phone: true,
      lat: true,
      lng: true,
      category: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.BUSINESS_UPDATED,
      entity: "Business",
      entityId: updated.id,
      before: {
        name: existing.name,
        type: existing.type,
        address: existing.address,
      },
      after: {
        name: updated.name,
        type: updated.type,
        address: updated.address,
      },
    },
  });

  return updated;
}

export async function deleteBusiness(userId: string, businessId: string) {
  const existing = await verifyBusinessOwnership(userId, businessId);

  if (!existing)
    throw new AppError(404, UMKM_ERROR_MESSAGES.BUSINESS_NOT_FOUND);

  await prisma.business.update({
    where: { id: businessId },
    data: { deletedAt: new Date() },
  });

  await prisma.inventoryItem.updateMany({
    where: { businessId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.BUSINESS_DELETED,
      entity: "Business",
      entityId: existing.id,
      before: {
        name: existing.name,
      },
    },
  });

  return { message: "Bisnis berhasil dihapus", id: businessId };
}

export async function getBusinessStats(userId: string, businessId: string) {
  await verifyBusinessOwnership(userId, businessId);

  const [inventoryStats, transactionStats] = await Promise.all([
    prisma.inventoryItem.aggregate({
      where: { businessId, deletedAt: null },
      _count: true,
      _sum: { quantity: true },
    }),

    prisma.businessTransaction.groupBy({
      by: ["type"],
      where: { businessId, deletedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const incomeStat = transactionStats.find((s) => s.type === "income");
  const expenseStat = transactionStats.find((s) => s.type === "expense");

  const totalIncome = incomeStat?._sum.amount || 0;
  const totalExpense = expenseStat?._sum.amount || 0;

  return {
    inventory: {
      totalItems: inventoryStats._count || 0,
      totalQuantity: inventoryStats._sum.quantity || 0,
    },
    transactions: {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      incomeCount: incomeStat?._count || 0,
      expenseCount: expenseStat?._count || 0,
    },
  };
}

