import {Decimal} from "decimal.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
  CreateInventoryInput,
  UpdateInventoryInput
} from "./umkm.schema.js";

//Create business
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

//List all
export async function listBusinesses(userId: string) {
  return prisma.business.findMany({
    where: {userId, deletedAt: null},
    include: {
      _count: {select: {inventoryItems: true}},
    },
    orderBy: {createdAt: "desc"},
  });
}

//Get single business
export async function getBusiness(userId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: {id: businessId, userId, deletedAt: null},
    include: {inventoryItems: {where: {deletedAt: null}, orderBy: {name: "asc"}}},
  });

  if(!business) throw new AppError(404, "Business not found");

  return business;
}

//UPdate business
export async function updateBusiness(userId: string, businessId: string, dto: UpdateBusinessInput) {
  const existing = await prisma.business.findFirst({
    where: {id: businessId, userId, deletedAt: null},
  });
  if(!existing) throw new AppError(404, "Business not found");

  const data: Record<string, unknown> = {};
  if (dto.name !== undefined) data.name = dto.name;
  if (dto.type !== undefined) data.type = dto.type;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.address !== undefined) data.address = dto.address;
  if (dto.phone !== undefined) data.phone = dto.phone;

  const updated = await prisma.business.update({
    where: {id: existing.id},
    data,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "BUSINESS_UPDATED",
      entity: "Business",
      entityId: updated.id,
      before: { name: existing.name, type: existing.type, description: existing.description, address: existing.address, phone: existing.phone } as object,
      after: { name: updated.name, type: updated.type, description: updated.description, address: updated.address, phone: updated.phone } as object,
    },
  });
  return updated;
}

//Soft delete business
export async function deleteBusiness(userId: string, businessId: string) {
  const existing = await prisma.business.findFirst({
    where: {id: businessId, userId, deletedAt: null},
  });
  if(!existing) throw new AppError(404, "Business not found");

  await prisma.business.update({
    where: {id: existing.id},
    data: {deletedAt: new Date()},
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "BUSINESS_DELETED",
      entity: "Business",
      entityId: existing.id,
      before: { name: existing.name, type: existing.type, description: existing.description, address: existing.address, phone: existing.phone } as object,
    },
  });

  return {message: "Business deleted"};
}

//Add inventory item
export async function addInventoryItem(userId: string, dto: CreateInventoryInput) {
  const business = await prisma.business.findFirst({
    where: {id: dto.businessId, userId, deletedAt: null},
  });
  if(!business) throw new AppError(404, "Business not found");

  const item = await prisma.inventoryItem.create({
    data: {
      businessId: business.id,
      userId,
      name: dto.name,
      quantity: dto.quantity,
      unitPrice: new Decimal(dto.unitPrice).toFixed(2),
      costPrice: dto.costPrice != null ? new Decimal(dto.costPrice).toFixed(2) : "0.00",
      unit: dto.unit ?? "pcs",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "INVENTORY_CREATED",
      entity: "InventoryItem",
      entityId: item.id,
      after: {name: item.name, businessId: item.businessId} as object,
    },
  });

  return item;
}

// List inventory
export async function listInventory(userId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: {id: businessId, userId, deletedAt: null},
  });
  if(!business) throw new AppError(404, "Business not found");

  return prisma.inventoryItem.findMany({
    where: {businessId, deletedAt: null},
    orderBy: {createdAt: "desc"},
  });
}

//Update inventory item
export async function updateInventoryIttem(userId: string, itemId: string, dto: UpdateInventoryInput) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: itemId, userId, deletedAt: null },
  });
  if (!existing) throw new AppError(404, "Inventory item not found");

  const data: Record<string, unknown> = {};
  if (dto.name !== undefined) data.name = dto.name;
  if (dto.sku !== undefined) data.sku = dto.sku;
  if (dto.quantity !== undefined) data.quantity = dto.quantity;
  if (dto.unitPrice !== undefined) data.unitPrice = new Decimal(dto.unitPrice).toFixed(2);
  if (dto.costPrice !== undefined) data.costPrice = new Decimal(dto.costPrice).toFixed(2);
  if (dto.unit !== undefined) data.unit = dto.unit;

  const updated = await prisma.inventoryItem.update({
    where: { id: existing.id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "INVENTORY_UPDATED",
      entity: "InventoryItem",
      entityId: updated.id,
      before: { name: existing.name, quantity: existing.quantity } as object,
      after: { name: updated.name, quantity: updated.quantity } as object,
    },
  });

  return updated;
}

//Soft delete inventory item
export async function deleteInventoryItem(userId: string, itemId: string) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: itemId, userId, deletedAt: null },
  });

  if(!existing) throw new AppError(404, "Inventory item not found");

  await prisma.inventoryItem.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "INVENTORY_DELETED",
      entity: "InventoryItem",
      entityId: existing.id,
    },
  });
}

// Inventory valuation
export async function getInventoryValuation(userId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: {id: businessId, userId, deletedAt: null},
  });
  if(!business) throw new AppError(404, "Business not found");

  const items = await prisma.inventoryItem.findMany({
    where: {businessId, deletedAt: null},
    orderBy: {name: "asc"},
  });

  let TotalRetailValue = new Decimal(0);
  let TotalCostValue = new Decimal(0);
  let totalItems = 0;

  const enriched = items.map((item) => {
    const retail = new Decimal(item.unitPrice.toString()).mul(item.quantity);
    const cost = new Decimal(item.costPrice.toString()).mul(item.quantity);
    TotalRetailValue = TotalRetailValue.plus(retail);
    TotalCostValue = TotalCostValue.plus(cost);
    totalItems += item.quantity;
    return {
      ...item,
      retailValue: retail.toFixed(2),
      costValue: cost.toFixed(2),
      margin: retail.minus(cost).toFixed(2),
    };
  });

  return {
    business: { id: business.id, name: business.name },
    summary: {
      totalItems,
      uniqueProducts: items.length,
      totalRetailValue: TotalRetailValue.toFixed(2),
      totalCostValue: TotalCostValue.toFixed(2),
      totalMargin: TotalRetailValue.minus(TotalCostValue).toFixed(2),
    },
    items: enriched,
  };
}


//Sales report
export async function getSalesReport(userId: string) {
  const [totalIncome, totalExpense, recentSales, categoryBreakdown] = await Promise.all([
    // Total income
    prisma.transaction.aggregate({
      where: { userId, type: "income", deletedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
    // Total expense
    prisma.transaction.aggregate({
      where: { userId, type: "expense", deletedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
    // Recent sales
    prisma.transaction.findMany({
      where: { userId, type: "income", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, amount: true, category: true, description: true, createdAt: true },
    }),
    // Group by category
    prisma.transaction.groupBy({
      by: ["category"],
      where: { userId, type: "income", deletedAt: null },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    }),
  ]);

  const income = totalIncome._sum.amount ?? 0;
  const expense = totalExpense._sum.amount ?? 0;

  return {
    totalIncome: income,
    totalExpense: expense,
    netProfit: income - expense,
    incomeTransactions: totalIncome._count,
    expenseTransactions: totalExpense._count,
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      total: c._sum.amount ?? 0,
      count: c._count,
    })),
    recentSales,
  };
}

