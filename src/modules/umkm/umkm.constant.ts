// Business Types
export const BUSINESS_TYPES = [
  "sole_proprietorship",
  "partnership",
  "corporation",
  "limited_liability",
] as const;

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  sole_proprietorship: "Usaha Dagang/Perseorangan",
  partnership: "Firma",
  corporation: "Perseroan",
  limited_liability: "PT/CV",
};

// Business Status
export const BUSINESS_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

// Inventory Units
export const INVENTORY_UNITS = [
  "pcs",
  "kg",
  "gram",
  "liter",
  "ml",
  "meter",
  "cm",
  "box",
  "pack",
  "set",
  "unit",
  "roll",
  "sheet",
  "bottle",
  "can",
  "cup",
] as const;

export const INVENTORY_UNIT_LABELS: Record<string, string> = {
  pcs: "Pcs",
  kg: "Kilogram",
  gram: "Gram",
  liter: "Liter",
  ml: "Milliliter",
  meter: "Meter",
  cm: "Centimeter",
  box: "Box",
  pack: "Pack",
  set: "Set",
  unit: "Unit",
  roll: "Roll",
  sheet: "Lembar",
  bottle: "Botol",
  can: "Kaleng",
  cup: "Cup",
};

export const STOCK_MOVEMENT_TYPES = {
  IN: "in",
  OUT: "out",
  ADJUSTMENT: "adjustment",
} as const;

export const BUSINESS_LIMITS = {
  NAME_MIN: 1,
  NAME_MAX: 200,
  DESCRIPTION_MAX: 2000,
  ADDRESS_MAX: 500,
  PHONE_MAX: 20,
  CATEGORY_MAX: 50,
} as const;

export const TRANSACTION_LIMITS = {
  AMOUNT_MIN: 1,
  AMOUNT_MAX: 99_999_999_999, // 99 miliar
  DESCRIPTION_MIN: 1,
  DESCRIPTION_MAX: 500,
  CATEGORY_MAX: 100,
  NOTES_MAX: 1000,
} as const;

export const INVENTORY_LIMITS = {
  NAME_MIN: 1,
  NAME_MAX: 200,
  SKU_MAX: 50,
  UNIT_MAX: 30,
  QUANTITY_MAX: 999_999_999,
  PRICE_MIN: 0,
  PRICE_MAX: 999_999_999_999, // 999 miliar
} as const;

export const MAPS_LIMITS = {
  LAT_MIN: -90,
  LAT_MAX: 90,
  LNG_MIN: -180,
  LNG_MAX: 180,
} as const;

export const DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_STOCK: 0,
  UNIT: "pcs",
} as const;

export const REPORT_PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;


export const UMKM_AUDIT_ACTIONS = {
  BUSINESS_CREATED: "BUSINESS_CREATED",
  BUSINESS_UPDATED: "BUSINESS_UPDATED",
  BUSINESS_DELETED: "BUSINESS_DELETED",

  BUSINESS_TX_CREATED: "BUSINESS_TX_CREATED",
  BUSINESS_TX_UPDATED: "BUSINESS_TX_UPDATED",
  BUSINESS_TX_DELETED: "BUSINESS_TX_DELETED",
  // Inventory
  INVENTORY_CREATED: "INVENTORY_CREATED",
  INVENTORY_UPDATED: "INVENTORY_UPDATED",
  INVENTORY_DELETED: "INVENTORY_DELETED",
  INVENTORY_STOCK_ADJUSTED: "INVENTORY_STOCK_ADJUSTED",
} as const;

//error nya
export const UMKM_ERROR_MESSAGES = {
  BUSINESS_NOT_FOUND: "Bisnis tidak ditemukan",
  BUSINESS_UNAUTHORIZED: "Anda tidak memiliki akses ke bisnis ini",
  BUSINESS_LIMIT_REACHED: "Anda telah mencapai batas maksimal bisnis",
  TRANSACTION_NOT_FOUND: "Transaksi bisnis tidak ditemukan",
  TRANSACTION_UNAUTHORIZED: "Anda tidak memiliki akses ke transaksi ini",
  INVENTORY_NOT_FOUND: "Item inventory tidak ditemukan",
  INVENTORY_UNAUTHORIZED: "Anda tidak memiliki akses ke item ini",
  INSUFFICIENT_STOCK: "Stok tidak mencukupi",
  INVALID_AMOUNT: "Jumlah transaksi tidak valid",
  INVALID_DATE_RANGE: "Rentang tanggal tidak valid",
  INVALID_COORDINATES: "Koordinat tidak valid",
  LAT_LNG_REQUIRED: "Latitude dan Longitude harus diisi bersamaan",
} as const;

//success 
export const UMKM_SUCCESS_MESSAGES = {
  BUSINESS_CREATED: "Bisnis berhasil dibuat",
  BUSINESS_UPDATED: "Bisnis berhasil diperbarui",
  BUSINESS_DELETED: "Bisnis berhasil dihapus",
  TRANSACTION_CREATED: "Transaksi bisnis berhasil dibuat",
  TRANSACTION_UPDATED: "Transaksi bisnis berhasil diperbarui",
  TRANSACTION_DELETED: "Transaksi bisnis berhasil dihapus",
  INVENTORY_CREATED: "Item inventory berhasil ditambahkan",
  INVENTORY_UPDATED: "Item inventory berhasil diperbarui",
  INVENTORY_DELETED: "Item inventory berhasil dihapus",
  STOCK_UPDATED: "Stok berhasil diperbarui",
} as const;
