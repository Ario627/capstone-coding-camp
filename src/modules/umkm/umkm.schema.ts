import { z } from "zod";
import {
  BUSINESS_LIMITS,
  TRANSACTION_LIMITS,
  INVENTORY_LIMITS,
  MAPS_LIMITS,
  DEFAULTS,
} from "./umkm.constant.js";

export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const businessIdParamSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULTS.PAGE),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(DEFAULTS.MAX_LIMIT)
    .default(DEFAULTS.LIMIT),
});

export const createBusinessSchema = z
  .object({
    name: z
      .string()
      .min(BUSINESS_LIMITS.NAME_MIN, "Nama bisnis wajib diisi")
      .max(
        BUSINESS_LIMITS.NAME_MAX,
        `Nama bisnis maksimal ${BUSINESS_LIMITS.NAME_MAX} karakter`,
      )
      .trim(),
    type: z
      .string()
      .min(1, "Tipe bisnis wajib diisi")
      .max(100, "Tipe bisnis maksimal 100 karakter")
      .trim(),
    description: z
      .string()
      .max(
        BUSINESS_LIMITS.DESCRIPTION_MAX,
        `Deskripsi maksimal ${BUSINESS_LIMITS.DESCRIPTION_MAX} karakter`,
      )
      .optional()
      .nullable(),
    address: z
      .string()
      .max(
        BUSINESS_LIMITS.ADDRESS_MAX,
        `Alamat maksimal ${BUSINESS_LIMITS.ADDRESS_MAX} karakter`,
      )
      .optional()
      .nullable(),
    phone: z
      .string()
      .max(
        BUSINESS_LIMITS.PHONE_MAX,
        `Nomor telepon maksimal ${BUSINESS_LIMITS.PHONE_MAX} karakter`,
      )
      .regex(/^[\d+\-\s()]*$/, "Format nomor telepon tidak valid")
      .optional()
      .nullable(),
    lat: z
      .coerce.number()
      .min(MAPS_LIMITS.LAT_MIN, `Latitude minimal ${MAPS_LIMITS.LAT_MIN}`)
      .max(MAPS_LIMITS.LAT_MAX, `Latitude maksimal ${MAPS_LIMITS.LAT_MAX}`)
      .optional()
      .nullable(),
    lng: z
      .coerce.number()
      .min(MAPS_LIMITS.LNG_MIN, `Longitude minimal ${MAPS_LIMITS.LNG_MIN}`)
      .max(MAPS_LIMITS.LNG_MAX, `Longitude maksimal ${MAPS_LIMITS.LNG_MAX}`)
      .optional()
      .nullable(),
    category: z
      .string()
      .max(
        BUSINESS_LIMITS.CATEGORY_MAX,
        `Kategori maksimal ${BUSINESS_LIMITS.CATEGORY_MAX} karakter`,
      )
      .optional()
      .nullable(),
  })
  .strict()
  .refine(
    (data) => {
      const hasLat = data.lat !== undefined && data.lat !== null;
      const hasLng = data.lng !== undefined && data.lng !== null;
      return hasLat === hasLng;
    },
    {
      message: "Latitude dan Longitude harus diisi bersamaan",
    },
  );

export const updateBusinessSchema = z
  .object({
    name: z
      .string()
      .min(BUSINESS_LIMITS.NAME_MIN)
      .max(BUSINESS_LIMITS.NAME_MAX)
      .trim()
      .optional(),
    type: z.string().min(1).max(100).trim().optional(),
    description: z
      .string()
      .max(BUSINESS_LIMITS.DESCRIPTION_MAX)
      .optional()
      .nullable(),
    address: z.string().max(BUSINESS_LIMITS.ADDRESS_MAX).optional().nullable(),
    phone: z
      .string()
      .max(BUSINESS_LIMITS.PHONE_MAX)
      .regex(/^[\d+\-\s()]*$/, "Format nomor telepon tidak valid")
      .optional()
      .nullable(),
    lat: z
      .number()
      .min(MAPS_LIMITS.LAT_MIN)
      .max(MAPS_LIMITS.LAT_MAX)
      .optional()
      .nullable(),
    lng: z
      .number()
      .min(MAPS_LIMITS.LNG_MIN)
      .max(MAPS_LIMITS.LNG_MAX)
      .optional()
      .nullable(),
    category: z
      .string()
      .max(BUSINESS_LIMITS.CATEGORY_MAX)
      .optional()
      .nullable(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (
        data.lat !== undefined &&
        data.lat !== null &&
        (data.lng === undefined || data.lng === null)
      ) {
        return false;
      }
      if (
        data.lng !== undefined &&
        data.lng !== null &&
        (data.lat === undefined || data.lat === null)
      ) {
        return false;
      }
      return true;
    },
    { message: "Latitude dan Longitude harus diisi bersamaanPOPPP" },
  );

export const businessListQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  isActive: z.coerce.boolean().optional(),
});

//Transaction
export const createBusinessTransactionSchema = z
  .object({
    businessId: z.string().min(1, "Business ID wajib diisi"),
    type: z.enum(["income", "expense"], "Tipe harus 'income' atau 'expense'"),
    amount: z
      .number()
      .int("Jumlah harus berupa integer")
      .min(
        TRANSACTION_LIMITS.AMOUNT_MIN,
        `Jumlah minimal ${TRANSACTION_LIMITS.AMOUNT_MIN}`,
      )
      .max(
        TRANSACTION_LIMITS.AMOUNT_MAX,
        `Jumlah maksimal ${TRANSACTION_LIMITS.AMOUNT_MAX}`,
      ),
    category: z
      .string()
      .min(1, "Kategori wajib diisi")
      .max(
        TRANSACTION_LIMITS.CATEGORY_MAX,
        `Kategori maksimal ${TRANSACTION_LIMITS.CATEGORY_MAX} karakter`,
      )
      .trim(),
    description: z
      .string()
      .min(TRANSACTION_LIMITS.DESCRIPTION_MIN, "Deskripsi wajib diisi")
      .max(
        TRANSACTION_LIMITS.DESCRIPTION_MAX,
        `Deskripsi maksimal ${TRANSACTION_LIMITS.DESCRIPTION_MAX} karakter`,
      )
      .trim(),
    transactionDate: z
      .union([
        z.date(),
        z.string().datetime(),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      ])
      .optional()
      .transform((val) => {
        if (!val) return new Date();
        if (val instanceof Date) return val;
        return new Date(val);
      }),
    paymentMethod: z
      .string()
      .max(50, "Metode pembayaran maksimal 50 karakter")
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(
        TRANSACTION_LIMITS.NOTES_MAX,
        `Catatan maksimal ${TRANSACTION_LIMITS.NOTES_MAX} karakter`,
      )
      .optional()
      .nullable(),
    receiptUrl: z
      .string()
      .url("URL receipt tidak valid")
      .max(500, "URL receipt maksimal 500 karakter")
      .optional()
      .nullable(),
  })
  .strict();

export const updateBusinessTransactionSchema = z
  .object({
    type: z.enum(["income", "expense"]).optional(),
    amount: z
      .number()
      .int()
      .min(TRANSACTION_LIMITS.AMOUNT_MIN)
      .max(TRANSACTION_LIMITS.AMOUNT_MAX)
      .optional(),
    category: z
      .string()
      .min(1)
      .max(TRANSACTION_LIMITS.CATEGORY_MAX)
      .trim()
      .optional(),
    description: z
      .string()
      .min(TRANSACTION_LIMITS.DESCRIPTION_MIN)
      .max(TRANSACTION_LIMITS.DESCRIPTION_MAX)
      .trim()
      .optional(),
    transactionDate: z
      .union([
        z.date(),
        z.string().datetime(),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      ])
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        if (val instanceof Date) return val;
        return new Date(val);
      }),
    paymentMethod: z.string().max(50).optional().nullable(),
    notes: z.string().max(TRANSACTION_LIMITS.NOTES_MAX).optional().nullable(),
    receiptUrl: z.string().url().max(500).optional().nullable(),
  })
  .strict();

export const businessTransactionListQuerySchema = paginationQuerySchema
  .extend({
    type: z.enum(["income", "expense"]).optional(),
    category: z.string().max(100).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD")
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD")
      .optional(),
    paymentMethod: z.string().max(50).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: "Tanggal mulai harus sebelum atau sama dengan tanggal akhir" },
  );

export const transactionSummaryQuerySchema = z.object({
  businessId: z.string().min(1, "Business ID wajib diisi"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD")
    .optional(),
});

//Inventory nyav
export const createInventoryItemSchema = z
  .object({
    businessId: z.string().min(1, "Business ID wajib diisi"),
    name: z
      .string()
      .min(INVENTORY_LIMITS.NAME_MIN, "Nama produk wajib diisi")
      .max(
        INVENTORY_LIMITS.NAME_MAX,
        `Nama produk maksimal ${INVENTORY_LIMITS.NAME_MAX} karakter`,
      )
      .trim(),
    sku: z
      .string()
      .max(
        INVENTORY_LIMITS.SKU_MAX,
        `SKU maksimal ${INVENTORY_LIMITS.SKU_MAX} karakter`,
      )
      .optional()
      .nullable(),
    quantity: z
      .number()
      .int("Jumlah harus berupa integer")
      .min(0, "Jumlah minimal 0")
      .max(
        INVENTORY_LIMITS.QUANTITY_MAX,
        `Jumlah maksimal ${INVENTORY_LIMITS.QUANTITY_MAX}`,
      )
      .default(0),
    unitPrice: z
      .union([
        z
          .number()
          .min(INVENTORY_LIMITS.PRICE_MIN)
          .max(INVENTORY_LIMITS.PRICE_MAX),
        z.string().regex(/^\d+(\.\d{1,2})?$/),
      ])
      .transform((val) => {
        if (typeof val === "string") return parseFloat(val);
        return val;
      }),
    costPrice: z
      .union([
        z
          .number()
          .min(INVENTORY_LIMITS.PRICE_MIN)
          .max(INVENTORY_LIMITS.PRICE_MAX),
        z.string().regex(/^\d+(\.\d{1,2})?$/),
      ])
      .optional()
      .nullable()
      .transform((val) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === "string") return parseFloat(val);
        return val;
      }),
    unit: z
      .string()
      .max(
        INVENTORY_LIMITS.UNIT_MAX,
        `Satuan maksimal ${INVENTORY_LIMITS.UNIT_MAX} karakter`,
      )
      .default(DEFAULTS.UNIT),
    minStock: z
      .number()
      .int()
      .min(0)
      .max(INVENTORY_LIMITS.QUANTITY_MAX)
      .default(DEFAULTS.MIN_STOCK),
    maxStock: z
      .number()
      .int()
      .min(0)
      .max(INVENTORY_LIMITS.QUANTITY_MAX)
      .optional()
      .nullable(),
    imageUrl: z
      .url("URL gambar tidak valid")
      .max(500, "URL gambar maksimal 500 karakter")
      .optional()
      .nullable(),
    barcode: z
      .string()
      .max(100, "Barcode maksimal 100 karakter")
      .optional()
      .nullable(),
  })
  .strict();

export const updateInventorySchema = z
  .object({
    name: z
      .string()
      .min(INVENTORY_LIMITS.NAME_MIN)
      .max(INVENTORY_LIMITS.NAME_MAX)
      .trim()
      .optional(),
    sku: z.string().max(INVENTORY_LIMITS.SKU_MAX).optional().nullable(),
    quantity: z
      .number()
      .int()
      .min(0)
      .max(INVENTORY_LIMITS.QUANTITY_MAX)
      .optional(),
    unitPrice: z
      .union([
        z
          .number()
          .min(INVENTORY_LIMITS.PRICE_MIN)
          .max(INVENTORY_LIMITS.PRICE_MAX),
        z.string().regex(/^\d+(\.\d{1,2})?$/),
      ])
      .transform((val) => {
        if (typeof val === "string") return parseFloat(val);
        return val;
      })
      .optional(),
    costPrice: z
      .union([
        z
          .number()
          .min(INVENTORY_LIMITS.PRICE_MIN)
          .max(INVENTORY_LIMITS.PRICE_MAX),
        z.string().regex(/^\d+(\.\d{1,2})?$/),
      ])
      .optional()
      .nullable()
      .transform((val) => {
        if (val === null || val === undefined) return undefined;
        if (typeof val === "string") return parseFloat(val);
        return val;
      }),
    unit: z.string().max(INVENTORY_LIMITS.UNIT_MAX).optional(),
    minStock: z
      .number()
      .int()
      .min(0)
      .max(INVENTORY_LIMITS.QUANTITY_MAX)
      .optional(),
    maxStock: z
      .number()
      .int()
      .min(0)
      .max(INVENTORY_LIMITS.QUANTITY_MAX)
      .optional()
      .nullable(),
    imageUrl: z.string().url().max(500).optional().nullable(),
    barcode: z.string().max(100).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const adjustStockSchema = z.object({
  adjustment: z.number().int("Penyesuaian harus berupa integer"),
  reason: z.string().max(500, "Alasan maksimal 500 karakter").optional(),
});

export const inventoryListQuerySchema = paginationQuerySchema.extend({
  search: z.string().max(100).optional(),
  lowStock: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

//Report ygy
export const reportPeriodSchema = z.object({
  period: z.enum(["daily", "weekly", "monthly", "yearly"]).default("monthly"),
});

export const dateRangeSchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD")
    .optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type BusinessListQuery = z.infer<typeof businessListQuerySchema>;

export type CreateBusinessTransactionInput = z.infer<
  typeof createBusinessTransactionSchema
>;
export type UpdateBusinessTransactionInput = z.infer<
  typeof updateBusinessTransactionSchema
>;
export type BusinessTransactionListQuery = z.infer<
  typeof businessTransactionListQuerySchema
>;

export type CreateInventoryInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;

export type ReportPeriod = z.infer<typeof reportPeriodSchema>;