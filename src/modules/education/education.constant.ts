export const EDUCATION_SYSTEM_PROMPT = `You are FinGrow AI, a smart and friendly financial assistant embedded inside the FinGrow application.

## YOUR IDENTITY
- Name: FinGrow Edu
- Tone: Friendly, casual but professional, easy to understand (use simple Indonesian or mixed Indonesian-English/Jaksel style if user speaks that way)
- You ONLY answer topics within financial education scope.

## YOUR SCOPE
1. FINANCIAL LITERACY — budgeting, saving, investment basics
2. UMKM FINANCIAL MANAGEMENT — income/expense, cash flow, funding
3. PERSONAL FINANCE — monthly budget, debt, emergency fund
4. BUSINESS PLAN ADVICE — simple business plan, revenue projection
5. DIGITAL PAYMENT GUIDANCE — payment options Indonesia, safe transactions
6. TRANSACTION REPORT INTERPRETATION — explain reports, actionable advice

## STRICT FILTERING
Tolak pertanyaan di luar 6 kategori di atas dengan:
"Hei, aku FinGrow Edu yang fokus di urusan keuangan dan UMKM ya! Untuk pertanyaan di luar itu, aku belum bisa bantu. Coba tanyakan soal budgeting, laporan keuangan, atau tips bisnis kamu — pasti aku siap bantu! 💚"

## RESPONSE FORMAT
- Max 3-4 paragraf pendek
- Gunakan bullet points untuk tips/langkah
- Akhiri dengan 1 follow-up question atau actionable suggestion

## USER CONTEXT
{{USER_CONTEXT}}

## LANGUAGE
- Jawab dalam Bahasa Indonesia
- Gunakan gaya bahasa yang sesuai dengan user (formal/casual/Jaksel)
- Jika user menggunakan bahasa casual/Jaksel, ikuti gaya bahasanya`;


export const EDUCATION_CONTEXT_LABELS: Record<string, string> = {
  general: 'Umum',
  saving: 'Menabung',
  investing: 'Investasi',
  budgeting: 'Anggaran',
  debt: 'Utang & Piutang',
  tax: 'Pajak',
  umkm: 'Keuangan UMKM',
};

export const EDUCATION_CONTEXT_DESCRIPTIONS: Record<string, string> = {
  general: 'Pertanyaan umum tentang keuangan',
  saving: 'Tips dan strategi menabung',
  investing: 'Dasar-dasar investasi untuk pemula',
  budgeting: 'Cara mengatur anggaran bulanan',
  debt: 'Manajemen utang dan cara melunasinya',
  tax: 'Pajak dasar untuk individu dan UMKM',
  umkm: 'Keuangan usaha kecil menengah',
};


export const DAILY_TIP_CATEGORIES = [
  'saving',
  'budgeting',
  'investing',
  'debt',
  'umkm',
  'tax',
  'digital_payment',
  'emergency_fund',
] as const;

export type DailyTipCategory = typeof DAILY_TIP_CATEGORIES[number];

export const DAILY_TIP_CATEGORY_LABELS: Record<string, string> = {
  saving: 'Tips Menabung',
  budgeting: 'Tips Budgeting',
  investing: 'Tips Investasi',
  debt: 'Tips Mengelola Utang',
  umkm: 'Tips Keuangan UMKM',
  tax: 'Tips Pajak',
  digital_payment: 'Tips Pembayaran Digital',
  emergency_fund: 'Tips Dana Darurat',
};

export const MODULE_DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export type ModuleDifficulty = typeof MODULE_DIFFICULTY[keyof typeof MODULE_DIFFICULTY];

export const MODULE_DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Pemula',
  intermediate: 'Menengah',
  advanced: 'Lanjutan',
};


export const MODULE_CATEGORIES = [
  'financial_basics',
  'budgeting',
  'saving',
  'investing',
  'debt_management',
  'umkm_finance',
  'tax_basics',
  'digital_finance',
] as const;

export type ModuleCategory = typeof MODULE_CATEGORIES[number];

export const MODULE_CATEGORY_LABELS: Record<string, string> = {
  financial_basics: 'Dasar Keuangan',
  budgeting: 'Pengelolaan Anggaran',
  saving: 'Menabung',
  investing: 'Investasi',
  debt_management: 'Manajemen Utang',
  umkm_finance: 'Keuangan UMKM',
  tax_basics: 'Dasar Pajak',
  digital_finance: 'Keuangan Digital',
};



export const TERMINOLOGY_CATEGORIES = [
  'general',
  'investment',
  'banking',
  'tax',
  'insurance',
  'umkm',
] as const;

export type TerminologyCategory = typeof TERMINOLOGY_CATEGORIES[number];

export const TERMINOLOGY_CATEGORY_LABELS: Record<string, string> = {
  general: 'Umum',
  investment: 'Investasi',
  banking: 'Perbankan',
  tax: 'Pajak',
  insurance: 'Asuransi',
  umkm: 'UMKM',
};

export const USER_TYPE_LABELS: Record<string, string> = {
  user: 'Pengguna',
  admin: 'Administrator',
};

export const USER_TYPE_WITH_BUSINESS_LABELS: Record<string, string> = {
  user_no_business: 'Pengguna Personal',
  user_with_business: 'Pengguna UMKM',
  admin: 'Administrator',
};

export type UserDisplayType = 'user_personal' | 'user_umkm' | 'admin';

export const USER_DISPLAY_LABELS: Record<UserDisplayType, string> = {
  user_personal: 'Pengguna Personal',
  user_umkm: 'Pengguna UMKM',
  admin: 'Administrator',
};

export const EDUCATION_RATE_LIMITS = {
  CHAT_DAILY_LIMIT: 30,
  CHAT_MONTHLY_LIMIT: 100,
  MODULE_READ_DAILY_LIMIT: 50,
} as const;

export const EDUCATION_CACHE_TTL = {
  DAILY_TIP: 3600,        // 1 jam
  MODULE_LIST: 1800,      // 30 menit
  MODULE_DETAIL: 3600,    // 1 jam
  TERMINOLOGY: 86400,     // 24 jam ygy
} as const;


export const CONTEXT_INJECTION_PLACEHOLDERS = {
  USER_CONTEXT: '{{USER_CONTEXT}}',
  USER_TYPE: '{{user_type}}',
  BALANCE_SUMMARY: '{{balance_summary}}',
  RECENT_TRANSACTIONS: '{{recent_transactions}}',
} as const;


export const EDUCATION_CHAT_DEFAULTS = {
  CONTEXT: 'general',
  MAX_MESSAGE_LENGTH: 2000,
  MAX_HISTORY_MESSAGES: 10,
  TEMPERATURE: 0.7,
  MAX_OUTPUT_TOKENS: 1500,
} as const;