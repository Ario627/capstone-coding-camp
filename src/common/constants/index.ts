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

export const WALLET_LIMITS = {
  MIN_TOP_UP: 10_000,
  MAX_TOP_UP: 5_000_000,
  MIN_TRANSACTION: 10_000,
  MAX_TRANSACTION: 5_000_000,
  MAX_DAILY_TOP_UP: 10_000_000,
  MAX_DAILY_TRANSFER: 5_000_000,
} as const;

export const WALLET_RATE_LIMITS = {
  READ_WINDOW_MS: 60_000,
  READ_MAX_REQUESTS: 30,
  WRITE_WINDOW_MS: 60_000,
  WRITE_MAX_REQUESTS: 10,
  TRANSFER_WINDOW_MS: 60_000,
  TRANSFER_MAX_REQUESTS: 5,
  CALLBACK_WINDOW_MS: 60_000,
  CALLBACK_MAX_REQUESTS: 20,
} as const;

export const WALLET_TYPE_LABELS: Record<string, string> = {
  TOP_UP: "Top Up Saldo",
  PPOB: "Pembayaran PPOB",
  TRANSFER_IN: "Transfer Masuk",
  TRANSFER_OUT: "Transfer Keluar",
  WITHDRAWAL: "Penarikan Saldo",
  REFUND: "Pengembalian Dana",
};

export const WALLET_STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  PROCESSING: "Sedang Diproses",
  COMPLETED: "Berhasil",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
  REFUNDED: "Dikembalikan",
};

export const PPOB_PRODUCTS = [
  {
    code: "PULSA_TELKOMSEL_10K",
    name: "Pulsa Telkomsel 10K",
    category: "PULSA",
    provider: "TELKOMSEL",
    amount: 10_000,
    fee: 2_000,
    minAmount: 10_000,
    maxAmount: 10_000,
  },
  {
    code: "PULSA_TELKOMSEL_25K",
    name: "Pulsa Telkomsel 25K",
    category: "PULSA",
    provider: "TELKOMSEL",
    amount: 25_000,
    fee: 2_500,
    minAmount: 25_000,
    maxAmount: 25_000,
  },
  {
    code: "PULSA_TELKOMSEL_50K",
    name: "Pulsa Telkomsel 50K",
    category: "PULSA",
    provider: "TELKOMSEL",
    amount: 50_000,
    fee: 3_000,
    minAmount: 50_000,
    maxAmount: 50_000,
  },
  {
    code: "PULSA_TELKOMSEL_100K",
    name: "Pulsa Telkomsel 100K",
    category: "PULSA",
    provider: "TELKOMSEL",
    amount: 100_000,
    fee: 4_000,
    minAmount: 100_000,
    maxAmount: 100_000,
  },
  {
    code: "PULSA_INDOSAT_10K",
    name: "Pulsa Indosat 10K",
    category: "PULSA",
    provider: "INDOSAT",
    amount: 10_000,
    fee: 2_000,
    minAmount: 10_000,
    maxAmount: 10_000,
  },
  {
    code: "PULSA_INDOSAT_25K",
    name: "Pulsa Indosat 25K",
    category: "PULSA",
    provider: "INDOSAT",
    amount: 25_000,
    fee: 2_500,
    minAmount: 25_000,
    maxAmount: 25_000,
  },
  {
    code: "PULSA_INDOSAT_50K",
    name: "Pulsa Indosat 50K",
    category: "PULSA",
    provider: "INDOSAT",
    amount: 50_000,
    fee: 3_000,
    minAmount: 50_000,
    maxAmount: 50_000,
  },
  {
    code: "PULSA_XL_10K",
    name: "Pulsa XL 10K",
    category: "PULSA",
    provider: "XL",
    amount: 10_000,
    fee: 2_000,
    minAmount: 10_000,
    maxAmount: 10_000,
  },
  {
    code: "PULSA_XL_25K",
    name: "Pulsa XL 25K",
    category: "PULSA",
    provider: "XL",
    amount: 25_000,
    fee: 2_500,
    minAmount: 25_000,
    maxAmount: 25_000,
  },
  {
    code: "PLN_TOKEN_20K",
    name: "Token Listrik 20K",
    category: "LISTRIK",
    provider: "PLN",
    amount: 20_000,
    fee: 2_000,
    minAmount: 20_000,
    maxAmount: 20_000,
  },
  {
    code: "PLN_TOKEN_50K",
    name: "Token Listrik 50K",
    category: "LISTRIK",
    provider: "PLN",
    amount: 50_000,
    fee: 2_500,
    minAmount: 50_000,
    maxAmount: 50_000,
  },
  {
    code: "PLN_TOKEN_100K",
    name: "Token Listrik 100K",
    category: "LISTRIK",
    provider: "PLN",
    amount: 100_000,
    fee: 3_000,
    minAmount: 100_000,
    maxAmount: 100_000,
  },
  {
    code: "PLN_TOKEN_200K",
    name: "Token Listrik 200K",
    category: "LISTRIK",
    provider: "PLN",
    amount: 200_000,
    fee: 4_000,
    minAmount: 200_000,
    maxAmount: 200_000,
  },
  {
    code: "PLN_TOKEN_500K",
    name: "Token Listrik 500K",
    category: "LISTRIK",
    provider: "PLN",
    amount: 500_000,
    fee: 5_000,
    minAmount: 500_000,
    maxAmount: 500_000,
  },
  {
    code: "DATA_TELKOMSEL_1GB",
    name: "Paket Data Telkomsel 1GB",
    category: "DATA",
    provider: "TELKOMSEL",
    amount: 25_000,
    fee: 3_000,
    minAmount: 25_000,
    maxAmount: 25_000,
  },
  {
    code: "DATA_TELKOMSEL_3GB",
    name: "Paket Data Telkomsel 3GB",
    category: "DATA",
    provider: "TELKOMSEL",
    amount: 50_000,
    fee: 4_000,
    minAmount: 50_000,
    maxAmount: 50_000,
  },
  {
    code: "DATA_TELKOMSEL_10GB",
    name: "Paket Data Telkomsel 10GB",
    category: "DATA",
    provider: "TELKOMSEL",
    amount: 100_000,
    fee: 5_000,
    minAmount: 100_000,
    maxAmount: 100_000,
  },
  {
    code: "DATA_INDOSAT_2GB",
    name: "Paket Data Indosat 2GB",
    category: "DATA",
    provider: "INDOSAT",
    amount: 30_000,
    fee: 3_500,
    minAmount: 30_000,
    maxAmount: 30_000,
  },
  {
    code: "DATA_XL_5GB",
    name: "Paket Data XL 5GB",
    category: "DATA",
    provider: "XL",
    amount: 55_000,
    fee: 4_500,
    minAmount: 55_000,
    maxAmount: 55_000,
  },
] as const;

export type PPOBProduct = (typeof PPOB_PRODUCTS)[number];

export const WALLET_TRANSACTION_CATEGORY_MAP: Record<string, string> = {
  TOP_UP: "Top Up Saldo",
  PPOB: "PPOB",
  TRANSFER_IN: "Transfer Masuk",
  TRANSFER_OUT: "Transfer Keluar",
  WITHDRAWAL: "Penarikan Saldo",
  REFUND: "Refund",
};

export const PROFILE_RATE_LIMITS = {
  READ_WINDOW_MS: 60_000,
  READ_MAX_REQUESTS: 30,
  WRITE_WINDOW_MS: 60_000,
  WRITE_MAX_REQUESTS: 10,
  PASSWORD_WINDOW_MS: 1_800_000,
  PASSWORD_MAX_REQUESTS: 3,
} as const;