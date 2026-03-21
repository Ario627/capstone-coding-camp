export const COOKIE_REFRESH_TOKEN = "findgrow_refresh_token";
export const COOKIE_CSRF = "findgrow_csrf_token";
export const COOKIE_OAUTH_REDIRECT_URL = "findgrow_oauth_redirect_url";

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Business Categories
export const BUSINESS_CATEGORIES = [
  "fnb",
  "retail",
  "service",
  "manufacture",
  "online_shop",
  "workshop",
  "salon",
  "laundry",
  "photography",
  "consultant",
  "other",
] as const;

export const BUSINESS_CATEGORY_LABELS: Record<string, string> = {
  fnb: "Kuliner & Minuman",
  retail: "Retail / Toko",
  service: "Jasa",
  manufacture: "Manufaktur",
  online_shop: "Online Shop",
  workshop: "Workshop / Bengkel",
  salon: "Salon / Barbershop",
  laundry: "Laundry",
  photography: "Fotografi",
  consultant: "Konsultan",
  other: "Lainnya",
};

// Business transaction 
export const BUSINESS_TRANSACTION_CATEGORIES = {
  INCOME: ["sales", "service_income", "other_income"],
  EXPENSE: [
    "cogs",
    "salary",
    "rent",
    "utilities",
    "marketing",
    "supplies",
    "maintenance",
    "transport",
    "tax",
    "other_expense",
  ],
} as const;

export const BUSINESS_TRANSACTION_CATEGORY_LABELS: Record<string, string> = {
  sales: "Penjualan",
  service_income: "Pendapatan Jasa",
  other_income: "Pendapatan Lainnya",
  cogs: "Harga Pokok Penjualan",
  salary: "Gaji Karyawan",
  rent: "Sewa Tempat",
  utilities: "Listrik, Air & Internet",
  marketing: "Marketing & Promosi",
  supplies: "Perlengkapan",
  maintenance: "Perawatan",
  transport: "Transportasi",
  tax: "Pajak",
  other_expense: "Pengeluaran Lainnya",
};

export const BUSINESS_PAYMENT_METHODS = [
  "cash",
  "transfer",
  "qris",
  "ewallet",
  "credit",
  "debit",
  "cod",
  "other",
] as const;

export const BUSINESS_PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Tunai",
  transfer: "Transfer Bank",
  qris: "QRIS",
  ewallet: "E-Wallet",
  credit: "Kartu Kredit",
  debit: "Kartu Debit",
  cod: "Bayar di Tempat (COD)",
  other: "Lainnya",
};

// Defaults untuk bisnis
export const UMKM_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_STOCK_DEFAULT: 0,
} as const;

// Rate Limits for bisnis
export const UMKM_RATE_LIMITS = {
  WINDOW_MS: 60_000, // 1 menit
  MAX_REQUESTS: 30,
} as const;
