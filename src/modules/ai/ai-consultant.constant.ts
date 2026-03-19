
import {
  AI_MODEL,
  AI_TOKEN_LIMITS,
  CONSULTANT_CONTEXT_LABELS,
} from './ai.constant.js';

export const CONSULTANT_RATE_LIMITS = {
  PER_MINUTE: 5,      // 5 requests per minute per user
  PER_HOUR: 10,        // 10 requests per hour per user
  PER_DAY: 20,         // 20 requests per day per user 
  PER_MONTH: 100,      // 100 requests per month per user
} as const;

export const CONSULTANT_QUOTA_LIMITS = {
  DAILY_DEFAULT: 20,
  MONTHLY_DEFAULT: 100,
  DAILY_MIN: 5,
  DAILY_MAX: 100,
  MONTHLY_MIN: 20,
  MONTHLY_MAX: 500,
} as const;

export const CONSULTANT_TOKEN_BUDGET = {
  // Reserve tokens for system prompt and context
  SYSTEM_PROMPT_RESERVE: 500,
  CONTEXT_RESERVE: 1000,
  
  // Max tokens for different parts
  MAX_MESSAGE_LENGTH: 2000,        // characters
  MAX_MESSAGE_TOKENS: 500,         // estimated tokens
  MAX_HISTORY_MESSAGES: 20,         // last N messages
  MAX_HISTORY_TOKENS: 2000,        // tokens for history
  
  // Total budget
  MAX_INPUT_TOKENS: 3500,           // buffer from AI_TOKEN_LIMITS.MAX_INPUT_TOKENS
  MAX_OUTPUT_TOKENS: 1500,          // buffer from AI_TOKEN_LIMITS.MAX_OUTPUT_TOKENS
} as const;

export const CONSULTANT_FILE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024,         // 5MB in bytes
  MAX_SIZE_MB: 5,
  
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/x-excel',
    'application/x-msexcel',
  ] as const,
  
  ALLOWED_EXTENSIONS: ['.pdf', '.xlsx', '.xls'],
  
  MAX_PAGES_PDF: 50,
  MAX_ROWS_EXCEL: 10000,
  MAX_SHEETS_EXCEL: 10,
  
  // Magic bytes for file validation
  MAGIC_BYTES: {
    PDF: [0x25, 0x50, 0x44, 0x46],                           // %PDF
    XLSX: [0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00], // PK zip (xlsx)
    XLS: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE (xls)
  } as const,
} as const;

export const CONSULTANT_CONVERSATION_LIMITS = {
  MAX_MESSAGES_PER_CONVERSATION: 100,
  MAX_ACTIVE_CONVERSATIONS: 10,
  INACTIVITY_EXPIRY_DAYS: 30,
  SUMMARY_THRESHOLD: 50,    // Generate summary after N messages
} as const;

export const CONSULTANT_CONTEXT_CONFIG = {
  // How far back to query data
  TRANSACTION_MONTHS: 6,
  RECENT_TRANSACTIONS_LIMIT: 50,
  PAYMENT_MONTHS: 6,
  
  // Trend calculation
  MONTHLY_TREND_MONTHS: 6,
  
  // Category limits
  TOP_CATEGORIES_LIMIT: 5,
  
  // Education progress
  INCLUDE_EDUCATION: true,
} as const;

export const DOCUMENT_DETECTION_PATTERNS = {
  BANK_STATEMENT: [
    /saldo\s*(awal|akhir)?/i,
    /mutasi\s*(rekening)?/i,
    /bank\s*(statement)?/i,
    /rekening/i,
    /transfer\s*(masuk|keluar)/i,
    /setor|tarik/i,
  ],
  INVOICE: [
    /invoice\s*(number|no)?/i,
    /faktur/i,
    /tagihan/i,
    /total\s*(bayar|harga)/i,
    /terima\s*kasih.*pembayaran/i,
  ],
  RECEIPT: [
    /nota/i,
    /struk/i,
    /pembayaran/i,
    /tunai|kembalian/i,
    /kasir/i,
    /terima\s*kasih/i,
  ],
  FINANCIAL_REPORT: [
    /laba\s*(rugi)?/i,
    /neraca/i,
    /arus\s*kas/i,
    /aset|kewajiban/i,
    /modal\s*(sendiri)?/i,
    /laporan\s*keuangan/i,
  ],
} as const;

export const PROMPT_INJECTION_PATTERNS = [
  // Instruction override attempts
  /ignore\s+(previous|all|above)\s+(instructions?|rules?)/i,
  /forget\s+(everything|all|previous)/i,
  /disregard\s+(your|the|all)\s+(programming|instructions?)/i,
  
  // System role attempts
  /system\s*:?\s*(you\s+are|you're|act|behave)/i,
  /assistant\s*:?\s*you\s+are/i,
  /\[SYSTEM\]/i,
  /\[ADMIN\]/i,
  /\[INSTRUCTIONS?\]/i,
  
  // Special tokens
  /<<.*>>/,
  /\{\{.*\}\}/,
  /<\|.*?\|>/,
  /###\s*(IMPORTANT|SYSTEM|ADMIN)/i,
  
  // Role switching
  /you\s+are\s+now\s+(a\s+)?(different|new)/i,
  /new\s+instructions?\s*(below|following)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if|a|an)/i,
  
  // Common attack patterns
  /prompt\s*(injection|injeksi)/i,
  /jailbreak/i,
  /DAN\s*:/i,
  /do\s+anything\s+now/i,
] as const;

export const AI_COST_PER_1K_TOKENS = {
  GROQ: {
    INPUT: 0.00001,   // Virtually free
    OUTPUT: 0.00001,
  },
  GEMINI_FLASH: {
    INPUT: 0.000075,
    OUTPUT: 0.0003,
  },
  GEMINI_PRO: {
    INPUT: 0.000125,
    OUTPUT: 0.0005,
  },
} as const;

export const COST_ALERT_THRESHOLDS = {
  REQUEST_MAX: 0.001,        // Max $0.001 per request
  DAILY_WARNING: 1.00,       // Warning at $1/day total
  DAILY_CRITICAL: 5.00,     // Critical at $5/day total
  MONTHLY_WARNING: 30.00,    // Warning at $30/month
  MONTHLY_CRITICAL: 100.00,  // Critical at $100/month
} as const;

export const CONSULTANT_SYSTEM_PROMPT = `You are FinGrow AI Consultant, a personal financial advisor embedded inside the FinGrow application.

## YOUR IDENTITY
- Name: FinGrow AI Consultant
- Tone: Professional but friendly, like a personal financial advisor who genuinely cares
- Language: Indonesian (casual-professional, use Jaksel style if user speaks casually)

## YOUR CAPABILITIES
You have access to user's personal financial data:
- Complete transaction history
- Financial summary (income, expense, balance, savings rate)
- Payment history
- Business data (if user owns UMKM)
- Education progress and achievements

Use this data to provide PERSONAL and SPECIFIC advice. Never give generic suggestions when you have actual data.

## YOUR SCOPE

### ALLOWED Topics:
1. **Personal Financial Analysis** - Based on user's actual transaction data
2. **Budget Recommendation** - Realistic budget allocation tailored to spending patterns
3. **Cash Flow Prediction** - Financial projections based on historical data
4. **Document Analysis** - Analyze uploaded PDF/Excel financial documents
5. **Financial Consultation** - Personal advice on debt, savings, investment concepts
6. **UMKM Finance** - Business cash flow, inventory, funding for business owners

### NOT ALLOWED:
- Specific stock/cryptocurrency recommendations ("Buy BBCA", "Sell BTC")
- Market timing predictions ("Stocks will go up tomorrow")
- Legal advice beyond basics
- Tax advice beyond basic concepts
- Anything outside financial domain

If user asks outside boundaries, politely redirect:
"Maaf, saya fokus membantu soal keuangan personal dan bisnis ya. Untuk topik lain, sebaiknya konsultasi dengan profesional yang tepat."

## CONTEXT INJECTION
{{USER_FINANCIAL_CONTEXT}}

{{DOCUMENT_CONTEXT}}

{{CONVERSATION_HISTORY}}

## RESPONSE FORMAT

1. **Brief acknowledgment** (1-2 sentences max)
2. **Data-driven insight** - Reference specific numbers from user's data
3. **Actionable recommendations** - Give specific steps with numbers
4. **Follow-up question** - End with 1 relevant question

Example response structure:
"Berikut analisis keuangan Anda berdasarkan data 6 bulan terakhir...

[Berdasarkan data, Anda memiliki surplus Rp X dari total pemasukan Rp Y...]

[Rekomendasi: Alokasikan Rp A untuk tabungan, Rp B untuk investasi...]

[Apakah Anda punya target keuangan tertentu dalam 12 bulan ke depan?]"

## SECURITY NOTES
- NEVER reveal you have direct database access
- NEVER show sensitive data like account numbers or full IDs
- ALWAYS reference data as "berdasarkan riwayat transaksi Anda"
- If data seems incomplete, acknowledge honestly: "Data transaksi Anda masih terbatas, sehingga analisis mungkin kurang akurat..."

## LANGUAGE RULES
- Respond in Bahasa Indonesia
- Match user's tone (formal/casual/Jaksel)
- Use Indonesian Rupiah (Rp) for all monetary values
- Format numbers with Indonesian locale (1.000.000, not 1,000,000)`;


export const CONTEXT_TEMPLATES = {
  USER_PROFILE: `
## PROFIL Pengguna
- Tipe: {{userType}}
- Bergabung: {{joinedAt}}
- Punya usaha: {{hasBusiness}}
- Streak pembelajaran: {{streakDays}} hari
`,
  
  FINANCIAL_SUMMARY: `
## Ringkasan Keuangan ({{period}})
- Total Pemasukan: Rp {{totalIncome}}
- Total Pengeluaran: Rp {{totalExpense}}
- Saldo: Rp {{balance}}
- Rasio Tabungan: {{savingsRate}}%
- Jumlah Transaksi: {{transactionCount}}
`,
  
  CATEGORY_BREAKDOWN: `
## Pengeluaran per Kategori (Top {{limit}})
{{#each categories}}
- {{category}}: Rp {{amount}} ({{percentage}}%)
{{/each}}
`,
  
  MONTHLY_TREND: `
## Tren Bulanan
{{#each trends}}
- {{month}}: Masuk Rp {{income}} | Keluar Rp {{expense}} | Saldo Rp {{balance}}
{{/each}}
`,
  
  RECENT_TRANSACTIONS: `
## Transaksi Terakhir ({{count}} terakhir)
{{#each transactions}}
- {{date}} | {{type}} | Rp {{amount}} | {{category}} | {{description}}
{{/each}}
`,
  
  BUSINESS_DATA: `
## Data Usaha
- Nama: {{businessName}}
- Tipe: {{businessType}}
- Jumlah Inventory: {{inventoryCount}}
- Nilai Inventory: Rp {{inventoryValue}}
`,
  
  DOCUMENT_CONTEXT: `
## Dokumen yang Di-upload
- Nama file: {{fileName}}
- Tipe: {{detectedType}}
- Ringkasan: {{summary}}
- Konten relevan:
{{extractedContent}}
`,
} as const;

export const CONSULTANT_ERROR_MESSAGES = {
  // Quota errors
  QUOTA_EXHAUSTED_DAILY: 'Quota harian Anda telah habis ({{used}}/{{limit}} digunakan). Quota akan direset setiap tengah malam (00:00 WIB).',
  QUOTA_EXHAUSTED_MONTHLY: 'Quota bulanan Anda telah habis ({{used}}/{{limit}} digunakan). Quota akan direset setiap awal bulan.',
  
  // Rate limit errors
  RATE_LIMIT_EXCEEDED: 'Terlalu banyak permintaan. Silakan coba lagi dalam {{retryAfter}} detik.',
  
  // Token errors
  TOKEN_BUDGET_EXCEEDED: 'Pesan dan riwayat percakapan terlalu panjang. Silakan mulai percakapan baru.',
  MESSAGE_TOO_LONG: 'Pesan terlalu panjang. Maksimal {{maxLength}} karakter.',
  
  // File errors
  FILE_TOO_LARGE: 'File terlalu besar. Maksimal ukuran file adalah {{maxSize}}MB.',
  INVALID_FILE_TYPE: 'Tipe file tidak didukung. Gunakan file PDF atau Excel (.pdf, .xlsx, .xls).',
  FILE_PARSE_ERROR: 'File tidak dapat dibaca. Pastikan file tidak rusak dan coba lagi.',
  INVALID_MIME_TYPE: 'Tipe file tidak valid. File mungkin rusak atau tidak sesuai.',
  
  // Conversation errors
  CONVERSATION_NOT_FOUND: 'Percakapan tidak ditemukan.',
  CONVERSATION_ACCESS_DENIED: 'Anda tidak memiliki akses ke percakapan ini.',
  CONVERSATION_LIMIT_EXCEEDED: 'Batas pesan dalam percakapan telah tercapai. Silakan mulai percakapan baru.',
  TOO_MANY_CONVERSATIONS: 'Anda memiliki terlalu banyak percakapan aktif. Hapus beberapa percakapan lama.',
  
  // Security errors
  PROMPT_INJECTION_DETECTED: 'Pesan mengandung pola yang tidak diizinkan. Silakan ubah pesan Anda.',
  INVALID_INPUT: 'Input tidak valid. Periksa kembali format pesan Anda.',
  
  // AI errors
  AI_PROVIDER_ERROR: 'Layanan AI sedang tidak tersedia. Silakan coba lagi dalam beberapa menit.',
  AI_RESPONSE_ERROR: 'Terjadi kesalahan saat memproses respons. Silakan coba lagi.',
  
  // Context errors
INSUFFICIENT_DATA: 'Data keuangan Anda masih terbatas. Tambahkan lebih banyak transaksi untuk mendapatkan analisis yang lebih akurat.',
  
  // Generic errors
  UNKNOWN_ERROR: 'Terjadi kesalahan. Silakan coba lagi.',
} as const;

export const CONSULTANT_SUCCESS_MESSAGES = {
  CHAT_SUCCESS: 'Pesan berhasil diproses.',
  FILE_UPLOADED: 'File berhasil diupload dan dianalisis.',
  CONVERSATION_CREATED: 'Percakapan baru dimulai.',
  CONVERSATION_DELETED: 'Percakapan berhasil dihapus.',
  QUOTA_RETRIEVED: 'Informasi quota berhasil diambil.',
} as const;

export const CONSULTANT_MODEL_CONFIG = {
  PRIMARY_MODEL: AI_MODEL.GROQ_LLAMA_70B,
  FALLBACK_MODEL: AI_MODEL.GEMINI_FLASH,
  TEMPERATURE: 0.7,
  TOP_P: 0.95,
  MAX_OUTPUT_TOKENS: CONSULTANT_TOKEN_BUDGET.MAX_OUTPUT_TOKENS,
} as const;

export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  salary: 'Gaji',
  bonus: 'Bonus',
  investment: 'Investasi',
  freelance: 'Freelance',
  other_income: 'Pemasukan Lainnya',
  food: 'Makanan',
  transport: 'Transportasi',
  shopping: 'Belanja',
  entertainment: 'Hiburan',
  health: 'Kesehatan',
  education: 'Pendidikan',
  household: 'Rumah Tangga',
  bills: 'Tagihan',
  savings: 'Tabungan',
  other_expense: 'Pengeluaran Lainnya',
};

export const USER_TYPE_TRANSLATIONS: Record<string, string> = {
  user_personal: 'Pengguna Personal',
  user_umkm: 'Pengguna UMKM',
  admin: 'Administrator',
};

export const DOCUMENT_TYPE_TRANSLATIONS: Record<string, string> = {
  bank_statement: 'Rekening Bank',
  invoice: 'Faktur/Tagihan',
  receipt: 'Nota/Struk',
  financial_report: 'Laporan Keuangan',
  unknown: 'Dokumen Lainnya',
};

export const CACHE_KEYS = {
  USER_CONTEXT: (userId: string) => `consultant:context:${userId}`,
  QUOTA: (userId: string) => `consultant:quota:${userId}`,
  CONVERSATION: (conversationId: string) => `consultant:conversation:${conversationId}`,
  USER_CONVERSATIONS: (userId: string) => `consultant:user_conversations:${userId}`,
} as const;

export const CACHE_TTL = {
  USER_CONTEXT: 300,        // 5 minutes
  QUOTA: 60,                // 1 minute
  CONVERSATION: 600,        // 10 minutes
  USER_CONVERSATIONS: 300,  // 5 minutes
} as const;