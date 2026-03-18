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