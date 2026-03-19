
export const AI_PROVIDER = {
  GROQ: 'groq',
  GEMINI: 'gemini',
} as const;

export const AI_MODEL = {
  GROQ_LLAMA_70B: 'llama-3.3-70b-versatile',
  GROQ_LLAMA_8B: 'llama-3.1-8b-instant',
  GEMINI_FLASH: 'gemini-2.0-flash',
  GEMINI_PRO: 'gemini-2.0-pro',
} as const;

export const AI_PROVIDER_PRIORITY = [AI_PROVIDER.GROQ, AI_PROVIDER.GEMINI] as const;

//Limits AI nya 
export const AI_RATE_LIMITS = {
  MONTHLY_LIMIT: 100,
  DAILY_LIMIT: 20,
  CHAT_MONTHLY_LIMIT: 50,
  ANALYSIS_MONTHLY_LIMIT: 30,
} as const;

// ============================================
// AI TOKEN LIMITS
// ============================================

export const AI_TOKEN_LIMITS = {
  MAX_INPUT_TOKENS: 4000,
  MAX_OUTPUT_TOKENS: 2000,
  MAX_CONVERSATION_HISTORY: 20,
} as const;

export const AI_CACHE_TTL = {
  SHORT: 300,
  MEDIUM: 900,
  LONG: 3600,
  VERY_LONG: 86400,
} as const;


export const AI_COST_PER_1K_TOKENS = {
  GROQ_INPUT: 0.00001,
  GROQ_OUTPUT: 0.00001,
  GEMINI_FLASH_INPUT: 0.000075,
  GEMINI_FLASH_OUTPUT: 0.0003,
  GEMINI_PRO_INPUT: 0.000125,
  GEMINI_PRO_OUTPUT: 0.0005,
} as const;


//Perencanaan endpoint AI nya
export const AI_ENDPOINTS = {
  NARRATIVE_REPORT: '/api/ai/narrative-report',
  FINANCIAL_PROJECTION: '/api/ai/financial-projection',
  FINANCIAL_ANALYSIS: '/api/ai/financial-analysis',
  BUDGET_OPTIMIZATION: '/api/ai/budget-optimization',
  ANOMALY_DETECTION: '/api/ai/anomaly-detection',
  SMART_CATEGORIZATION: '/api/ai/smart-categorization',
  GOAL_RECOMMENDATION: '/api/ai/goal-recommendation',
  SPENDING_INSIGHTS: '/api/ai/spending-insights',
  CHAT: '/api/ai/chat',
  EDUCATION_CHAT: '/api/education/chat',
  CONSULTANT_CHAT: '/api/consultant/chat',
  CONSULTANT_CHAT_FILE: '/api/consultant/chat/file',
} as const;


export const TRANSACTION_CATEGORIES = {
  INCOME: ['salary', 'bonus', 'investment', 'freelance', 'other_income'],
  EXPENSE: [
    'food',
    'transport',
    'shopping',
    'entertainment',
    'health',
    'education',
    'household',
    'bills',
    'savings',
    'other_expense',
  ],
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


export const HEALTH_SCORE = {
  EXCELLENT: { min: 80, label: 'Sangat Baik', color: 'green' },
  GOOD: { min: 60, max: 79, label: 'Baik', color: 'blue' },
  FAIR: { min: 40, max: 59, label: 'Cukup', color: 'yellow' },
  POOR: { min: 0, max: 39, label: 'Perlu Perbaikan', color: 'red' },
} as const;



export const EDUCATION_CONTEXT = {
  GENERAL: 'general',
  SAVING: 'saving',
  INVESTING: 'investing',
  BUDGETING: 'budgeting',
  DEBT: 'debt',
  TAX: 'tax',
  UMKM: 'umkm',
} as const;

export const AI_DEFAULTS = {
  MODEL: AI_MODEL.GROQ_LLAMA_70B,
  FALLBACK_MODEL: AI_MODEL.GEMINI_FLASH,
  TEMPERATURE: 0.7,
  MAX_OUTPUT_TOKENS: 2000,
  TOP_P: 0.95,
  TOP_K: 40,
} as const;

// AI SYSTEM PROMPTS
export const AI_SYSTEM_PROMPTS = {
  GENERAL: `Kamu adalah asisten finansial AI bernama FinGrow.

Kamu bisa membantu user dengan:
- Analisis keuangan personal
- Proyeksi finansial
- Rekomendasi budget
- Insight pengeluaran dan penghematan

## TONE
- Profesional dan langsung ke poin
- Actionable dan berbasis data
- Bahasa Indonesia

## FORMAT
- Berikan jawaban konkret dengan angka dan data
- Sertakan rekomendasi yang bisa langsung diimplementasikan
- Gunakan bullet points untuk clarity
`,

  EDUCATION: `Kamu adalah asisten edukasi keuangan bernama FinGrow Edu.

## KARAKTERISTIK
- Tone: Edukatif, sabar, dan mudah dipahami
- Bahasa: Bahasa Indonesia yang formal tapi ramah
- Selalu berikan contoh dalam konteks Indonesia (Rupiah, regulasi OJK, dll)

## BATASAN TOPIK (HANYA FINANSIAL)
 Diperbolehkan:
- Tabungan dan cara mengelola uang
- Investasi dasar (reksa dana, deposito, saham - konsep saja)
- Budgeting dan pengelolaan keuangan pribadi
- Utang dan cara mengelolanya
- Pajak (PPh, PPN dasar)
- Keuangan UMKM
- Asuransi dan manajemen risiko

 Tidak diperbolehkan:
- Topik di luar finansial (politik, hiburan, dll)
- Saran beli instrumen spesifik ("Beli saham BBCA")
- Prediksi pasar atau harga

## FORMAT JAWABAN
1. Jelaskan konsep dengan bahasa sederhana (1-2 paragraf)
2. Berikan contoh nyata dengan nominal Rupiah
3. Sertakan tips praktis yang bisa langsung diterapkan
4. Akhiri dengan pertanyaan follow-up untuk memastikan pemahaman

## LARANGAN
- Jangan memberikan saran investasi spesifik
- Jangan merekomendasikan produk finansial tertentu
- Jangan memberikan prediksi pasar
- Jangan menghakimi kondisi finansial user

Jika user bertanya di luar topik finansial, arahkan kembali dengan sopan:
"Maaf, saya hanya bisa membantu pertanyaan seputar keuangan. Ada yang ingin Anda tanyakan tentang mengelola keuangan?"
`,

  CATEGORIZATION: `Kamu adalah sistem kategorisasi cerdas FinGrow AI.

Tentukan kategori yang paling sesuai untuk transaksi berikut.

Kategori yang tersedia:
- Pemasukan: salary, bonus, investment, freelance, other_income
- Pengeluaran: food, transport, shopping, entertainment, health, education, household, bills, savings, other_expense

Jawab HANYA dengan nama kategori dalam format snake_case (lowercase dengan underscore).
Contoh: "food", "salary", "transport"

Jangan tambahkan penjelasan apapun.
`,
} as const;


export const CONSULTANT_RATE_LIMITS = {
  PER_MINUTE: 5,
  PER_HOUR: 10,
  PER_DAY: 20,
} as const;

export const CONSULTANT_QUOTA_LIMITS = {
  DAILY_DEFAULT: 20,
  MONTHLY_DEFAULT: 100,
  DAILY_MIN: 5,
  MONTHLY_MIN: 20,
} as const;

export const CONSULTANT_TOKEN_BUDGET = {
  MAX_INPUT_TOKENS: 3500,
  MAX_OUTPUT_TOKENS: 1500,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_CONVERSATION_MESSAGES: 50,
} as const;

export const CONSULTANT_FILE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ] as const,
  ALLOWED_EXTENSIONS: ['.pdf', '.xlsx', '.xls'],
  MAX_PAGES_PDF: 50,
  MAX_ROWS_EXCEL: 10000,
} as const;

export const CONSULTANT_CONVERSATION_LIMITS = {
  MAX_MESSAGES: 100,
  MAX_ACTIVE_CONVERSATIONS: 10,
  INACTIVITY_EXPIRY_DAYS: 30,
} as const;

export const CONSULTANT_SYSTEM_PROMPT = `You are FinGrow AI Consultant, a personal financial advisor embedded inside the FinGrow application.

## YOUR IDENTITY
- Name: FinGrow AI Consultant
- Tone: Professional but friendly, like a personal financial advisor who cares
- Language: Indonesian (casual-professional, Jaksel style if user speaks casual)

## YOUR CAPABILITIES
You have access to user's personal financial data:
- Complete transaction history
- Financial summary (income, expense, balance)
- Payment data
- Business data (if UMKM user)
- Education progress

Use this data to provide PERSONAL and SPECIFIC advice, not generic suggestions.

## YOUR SCOPE
1. PERSONAL FINANCIAL ANALYSIS — based on real transaction data
2. BUDGET RECOMMENDATION — realistic budget allocation
3. CASH FLOW PREDICTION — financial projection based on history
4. DOCUMENT ANALYSIS — analyze uploaded PDF/Excel financial documents
5. FINANCIAL CONSULTATION — personal financial advice

## STRICT BOUNDARIES
 ALLOWED:
- Personal finance advice based on user's actual data
- Budget planning and optimization
- Spending analysis and recommendations
- Cash flow projections
- Debt management strategies
- Investment basics (concepts only, not specific stocks)
- Business finance for UMKM

 NOT ALLOWED:
- Specific stock/coin recommendations
- Market timing predictions
- Legal or tax advice beyond basics
- Anything outside financial domain

If user asks outside boundaries, politely redirect:
"Maaf, saya hanya bisa membantu soal keuangan personal dan bisnis ya. Untuk topik lain, coba konsultasi dengan profesional yang tepat."

## CONTEXT INJECTION (runtime)
{{USER_FINANCIAL_CONTEXT}}

{{DOCUMENT_CONTEXT}}

{{CONVERSATION_HISTORY}}

## RESPONSE FORMAT
1. Brief acknowledgment (1-2 sentences)
2. Data-driven insight from user's actual data
3. Specific recommendations with numbers
4. End with 1 relevant follow-up question

## SECURITY NOTES
- Never reveal you have access to raw database
- Never show sensitive data like account numbers
- Always reference data as "based on your transaction history"
- If data seems incomplete, acknowledge it honestly`;

export const SUSPICIOUS_PATTERNS = [
  /ignore\s+(previous|all)\s+instructions/i,
  /system\s*:\s*you\s+are/i,
  /disregard\s+(your|the)\s+(programming|instructions)/i,
  /\[SYSTEM\]/i,
  /<<.*>>/,
  /\{\{.*\}\}/,
  /###\s*IMPORTANT/i,
  /forget\s+(everything|all)/i,
  /you\s+are\s+now\s+a\s+different/i,
  /new\s+instructions\s+below/i,
] as const;

export const CONSULTANT_CONTEXT_LABELS = {
  USER_TYPE: {
    user_personal: 'Pengguna Personal',
    user_umkm: 'Pengguna UMKM',
    admin: 'Administrator',
  },
  PERIOD: '6 bulan terakhir',
  CURRENCY: 'IDR',
  DATA_SOURCE: 'berdasarkan riwayat transaksi Anda',
} as const;

export const CONSULTANT_ERROR_MESSAGES = {
  QUOTA_EXHAUSTED_DAILY: 'Quota harian Anda telah habis. Quota akan direset setiap tengah malam (00:00 WIB).',
  QUOTA_EXHAUSTED_MONTHLY: 'Quota bulanan Anda telah habis. Quota akan direset setiap awal bulan.',
  RATE_LIMIT_EXCEEDED: 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.',
  TOKEN_BUDGET_EXCEEDED: 'Pesan terlalu panjang. Silakan mulai percakapan baru atau singkatkan pesan Anda.',
  FILE_TOO_LARGE: 'File terlalu besar. Maksimal ukuran file adalah 5MB.',
  INVALID_FILE_TYPE: 'Tipe file tidak didukung. Gunakan file PDF atau Excel (.pdf, .xlsx, .xls).',
  FILE_PARSE_ERROR: 'File tidak dapat dibaca. Pastikan file tidak rusak dan coba lagi.',
  CONVERSATION_NOT_FOUND: 'Percakapan tidak ditemukan.',
  CONVERSATION_ACCESS_DENIED: 'Anda tidak memiliki akses ke percakapan ini.',
  CONVERSATION_LIMIT_EXCEEDED: 'Batas pesan dalam percakapan telah tercapai. Mulai percakapan baru.',
  PROMPT_INJECTION_DETECTED: 'Pesan mengandung pola yang tidak diizinkan.',
  MESSAGE_TOO_LONG: 'Pesan terlalu panjang. Maksimal 2000 karakter.',
} as const;