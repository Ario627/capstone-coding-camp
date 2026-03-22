import { Decimal } from "decimal.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { UMKM_AUDIT_ACTIONS, UMKM_ERROR_MESSAGES } from "./umkm.constant.js";
import type {
  CreateInventoryInput,
  UpdateInventoryInput,
  InventoryListQuery,
  AdjustStockInput,
} from "./umkm.schema.js";
//Helper
import { verifyBusinessOwnership } from "./business.service.js";
import { parseDate } from "./business-transaction.service.js";

//Helper juga
function calculateStockStatus(
  quantity: number,
  minStock: number,
  maxStock: number | null,
): "low" | "optimal" | "overstock" {
  if (quantity <= minStock) return "low";
  if (maxStock !== null && quantity > maxStock) return "overstock";
  return "optimal";
}

// Helper
async function verifyInventoryOwnership(userId: string, itemId: string) {
  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, deletedAt: null },
    include: {
      business: {
        select: { id: true, userId: true, name: true },
      },
    },
  });

  if (!item) {
    throw new AppError(404, UMKM_ERROR_MESSAGES.INVENTORY_NOT_FOUND);
  }

  if (item.business.userId !== userId) {
    throw new AppError(403, UMKM_ERROR_MESSAGES.INVENTORY_UNAUTHORIZED);
  }

  return item;
}

export async function createInventoryItem(
  userId: string,
  dto: CreateInventoryInput,
) {
  // Verifikasi
  await verifyBusinessOwnership(userId, dto.businessId);

  if (
    dto.maxStock !== undefined &&
    dto.maxStock !== null &&
    dto.minStock !== undefined
  ) {
    if (dto.maxStock < dto.minStock) {
      throw new AppError(
        400,
        "Stok maksimal harus lebih besar dari stok minimal",
      );
    }
  }

  // validasi costPrice < unitPrice
  const unitPrice = new Decimal(dto.unitPrice);
  const costPrice =
    dto.costPrice !== undefined && dto.costPrice !== null
      ? new Decimal(dto.costPrice)
      : new Decimal(0);

  const item = await prisma.inventoryItem.create({
    data: {
      businessId: dto.businessId,
      userId: userId,
      name: dto.name,
      sku: dto.sku ?? null,
      quantity: dto.quantity ?? 0,
      unitPrice: unitPrice,
      costPrice: costPrice,
      unit: dto.unit ?? "pcs",
      minStock: dto.minStock ?? 0,
      maxStock: dto.maxStock ?? null,
      imageUrl: dto.imageUrl ?? null,
      barcode: dto.barcode ?? null,
    },
    select: {
      id: true,
      businessId: true,
      name: true,
      sku: true,
      quantity: true,
      unitPrice: true,
      costPrice: true,
      unit: true,
      minStock: true,
      maxStock: true,
      imageUrl: true,
      barcode: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.INVENTORY_CREATED,
      entity: "InventoryItem",
      entityId: item.id,
      after: {
        name: item.name,
        businessId: dto.businessId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      },
    },
  });

  return item;
}

export async function listInventoryItems(
  userId: string,
  businessId: string,
  query: InventoryListQuery,
) {
  await verifyBusinessOwnership(userId, businessId);

  const { page = 1, limit = 10, search, lowStock, isActive } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    businessId,
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [total, items] = await Promise.all([
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ quantity: "asc" }, { name: "asc" }], // Low stock first
      select: {
        id: true,
        businessId: true,
        name: true,
        sku: true,
        quantity: true,
        unitPrice: true,
        costPrice: true,
        unit: true,
        minStock: true,
        maxStock: true,
        imageUrl: true,
        barcode: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const enrichedItems = items.map((item) => {
    const unitPrice = new Decimal(item.unitPrice.toString());
    const costPrice = new Decimal(item.costPrice.toString());
    const retailValue = unitPrice.mul(item.quantity);
    const costValue = costPrice.mul(item.quantity);
    const margin = retailValue.minus(costValue);

    return {
      ...item,
      unitPrice: item.unitPrice.toString(),
      costPrice: item.costPrice.toString(),
      retailValue: retailValue.toFixed(2),
      costValue: costValue.toFixed(2),
      margin: margin.toFixed(2),
      stockStatus: calculateStockStatus(
        item.quantity,
        item.minStock,
        item.maxStock,
      ),
      isLowStock: item.quantity <= item.minStock,
    };
  });

  const finalItems =
    lowStock !== undefined
      ? enrichedItems.filter((item) =>
          lowStock ? item.isLowStock : !item.isLowStock,
        )
      : enrichedItems;

  return {
    page,
    limit,
    total: lowStock !== undefined ? finalItems.length : total,
    totalPages: Math.ceil(
      (lowStock !== undefined ? finalItems.length : total) / limit,
    ),
    items: finalItems,
  };
}

export async function getInventoryItem(userId: string, itemId: string) {
  const item = await verifyInventoryOwnership(userId, itemId);

  const unitPrice = new Decimal(item.unitPrice.toString());
  const costPrice = new Decimal(item.costPrice.toString());
  const retailValue = unitPrice.mul(item.quantity);
  const costValue = costPrice.mul(item.quantity);

  return {
    ...item,
    unitPrice: item.unitPrice.toString(),
    costPrice: item.costPrice.toString(),
    retailValue: retailValue.toFixed(2),
    costValue: costValue.toFixed(2),
    margin: retailValue.minus(costValue).toFixed(2),
    stockStatus: calculateStockStatus(
      item.quantity,
      item.minStock,
      item.maxStock,
    ),
    isLowStock: item.quantity <= item.minStock,
    business: {
      id: item.business.id,
      name: item.business.name,
    },
  };
}

export async function updateInventoryItem(
  userId: string,
  itemId: string,
  dto: UpdateInventoryInput,
) {
  const existing = await verifyInventoryOwnership(userId, itemId);

  const newMinStock = dto.minStock ?? existing.minStock;
  const newMaxStock = dto.maxStock ?? existing.maxStock;
  if (newMaxStock !== null && newMaxStock < newMinStock) {
    throw new AppError(
      400,
      "Stok maksimal harus lebih besar dari stok minimal",
    );
  }

  const { unitPrice, costPrice, ...restDto } = dto;

  const data: Record<string, any> = Object.fromEntries(
    Object.entries(restDto).filter(([_, v]) => v !== undefined),
  );

  if (unitPrice !== undefined) {
    data.unitPrice = new Decimal(unitPrice).toFixed(2);
  }
  if (costPrice !== undefined) {
    data.costPrice =
      costPrice !== null ? new Decimal(costPrice).toFixed(2) : "0.00";
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data,
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.INVENTORY_UPDATED,
      entity: "InventoryItem",
      entityId: updated.id,
      before: {
        name: existing.name,
        quantity: existing.quantity,
        unitPrice: existing.unitPrice.toString(),
      },
      after: {
        name: updated.name,
        quantity: updated.quantity,
        unitPrice: updated.unitPrice.toString(),
      },
    },
  });

  return {
    ...updated,
    unitPrice: updated.unitPrice.toString(),
    costPrice: updated.costPrice.toString(),
  };
}

export async function adjustStock(
  userId: string,
  itemId: string,
  dto: AdjustStockInput,
) {
  const existing = await verifyInventoryOwnership(userId, itemId);

  const newQuantity = existing.quantity + dto.adjustment;

  if (newQuantity < 0) {
    throw new AppError(
      400,
      `${UMKM_ERROR_MESSAGES.INSUFFICIENT_STOCK}. Stok saat ini: ${existing.quantity}`,
    );
  }

  if (existing.maxStock !== null && newQuantity > existing.maxStock) {
    throw new AppError(
      400,
      `Stok melebihi batas maksimal (${existing.maxStock})`,
    );
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { quantity: newQuantity },
    select: {
      id: true,
      businessId: true,
      name: true,
      quantity: true,
      minStock: true,
      maxStock: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.INVENTORY_STOCK_ADJUSTED,
      entity: "InventoryItem",
      entityId: updated.id,
      before: {
        name: existing.name,
        quantity: existing.quantity,
      },
      after: {
        name: updated.name,
        quantity: updated.quantity,
        adjustment: dto.adjustment,
        reason: dto.reason,
      },
    },
  });

  return {
    ...updated,
    previousQuantity: existing.quantity,
    adjustment: dto.adjustment,
    stockStatus: calculateStockStatus(
      updated.quantity,
      updated.minStock,
      updated.maxStock,
    ),
  };
}

//Soft delete
export async function deleteInventoryItem(userId: string, itemId: string) {
  const existing = await verifyInventoryOwnership(userId, itemId);

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: UMKM_AUDIT_ACTIONS.INVENTORY_DELETED,
      entity: "InventoryItem",
      entityId: existing.id,
      before: {
        name: existing.name,
        quantity: existing.quantity,
        businessId: existing.businessId,
      },
    },
  });

  return { message: "Item inventory berhasil dihapus", id: itemId };
}



export async function getInventoryValuation(
  userId: string,
  businessId: string,
  lowStockOnly: boolean = false,
) {
  const business = await verifyBusinessOwnership(userId, businessId);

  const where: Record<string, unknown> = {
    businessId,
    deletedAt: null,
    isActive: true,
  };

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      quantity: true,
      unitPrice: true,
      costPrice: true,
      unit: true,
      minStock: true,
      maxStock: true,
    },
  });

  let totalRetailValue = new Decimal(0);
  let totalCostValue = new Decimal(0);
  let totalItems = 0;
  let lowStockCount = 0;

  const enrichedItems = items.map((item) => {
    const unitPrice = new Decimal(item.unitPrice.toString());
    const costPrice = new Decimal(item.costPrice.toString());
    const retailValue = unitPrice.mul(item.quantity);
    const costValue = costPrice.mul(item.quantity);
    const margin = retailValue.minus(costValue);
    const stockStatus = calculateStockStatus(
      item.quantity,
      item.minStock,
      item.maxStock,
    );

    totalRetailValue = totalRetailValue.plus(retailValue);
    totalCostValue = totalCostValue.plus(costValue);
    totalItems += item.quantity;

    if (item.quantity <= item.minStock) {
      lowStockCount++;
    }

    return {
      ...item,
      unitPrice: item.unitPrice.toString(),
      costPrice: item.costPrice.toString(),
      retailValue: retailValue.toFixed(2),
      costValue: costValue.toFixed(2),
      margin: margin.toFixed(2),
      stockStatus,
      isLowStock: stockStatus === "low",
    };
  });

  const finalItems = lowStockOnly
    ? enrichedItems.filter((item) => item.isLowStock)
    : enrichedItems;

  return {
    business: {
      id: business.id,
      name: business.name,
    },
    summary: {
      totalItems,
      uniqueProducts: items.length,
      totalRetailValue: totalRetailValue.toFixed(2),
      totalCostValue: totalCostValue.toFixed(2),
      totalMargin: totalRetailValue.minus(totalCostValue).toFixed(2),
      lowStockCount,
    },
    items: finalItems,
  };
}

export async function getLowStockItems(userId: string, businessId: string) {
  await verifyBusinessOwnership(userId, businessId);

  const items = await prisma.inventoryItem.findMany({
    where: {
      businessId,
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ quantity: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      quantity: true,
      minStock: true,
      unit: true,
      unitPrice: true,
    },
  });

  const lowStockItems = items
    .filter((item) => item.quantity <= item.minStock)
    .map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toString(),
      shortage: item.minStock - item.quantity,
    }));

  return {
    count: lowStockItems.length,
    items: lowStockItems,
  };
}
