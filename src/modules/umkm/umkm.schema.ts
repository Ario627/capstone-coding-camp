import { z } from "zod";

export const createBusinessSchema = z
  .object({
    name: z.string().min(1, "Nama bisnis wajib diisi").max(200).trim(),
    type: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
    address: z.string().max(500).optional(),
    phone: z.string().max(20).optional(),
  })
  .strict();

export const updateBusinessSchema = createBusinessSchema.partial();

export const createInventoryItemSchema = z
  .object({
    businessId: z.string().min(1, "businessId wajib diisi"),
    name: z.string().min(1).max(200),
    sku: z.string().max(50).optional(),
    quantity: z.number().int().min(0),
    unitPrice: z.number().min(0).multipleOf(0.01),
    costPrice: z.number().min(0).multipleOf(0.01).optional(),
    unit: z.string().max(30).default("pcs"),
  })
  .strict();

export const updateInventorySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    sku: z.string().max(50).optional(),
    quantity: z.number().int().min(0).optional(),
    unitPrice: z.number().min(0).multipleOf(0.01).optional(),
    costPrice: z.number().min(0).multipleOf(0.01).optional(),
    unit: z.string().max(30).optional(),
  })
  .strict();

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type CreateInventoryInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;