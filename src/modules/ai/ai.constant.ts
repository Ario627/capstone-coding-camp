
export const AI_PROVIDER = {
  GROQ: 'groq',
  GEMINI: 'gemini',
} as const;


export const AI_MODEL = {
  GROQ_LLAMA_70B: 'llama-3.3-70b-versatile',
  GROQ_LLAMA_8B: 'llama-3.1-8b-instant',
  GEMINI_FLASH: 'gemini-3.0-flash',
  GEMINI_PRO: 'gemini-3.0-pro',
} as const;

//Biar cepet 
export const AI_PROVIDER_PRIORITY = [AI_PROVIDER.GROQ, AI_PROVIDER.GEMINI] as const;

// Rate Limiting nya
export const AI_RATE_LIMITS = {
  MONTHLY_LIMIT: 100,
  DAILY_LIMIT: 20,
  CHAT_MONTHLY_LIMIT: 50,
  ANALYSIS_MONTHLY_LIMIT: 30,
} as const;


export const AI_TOKEN_LIMITS = {
  MAX_INPUT_TOKENS: 4000,
  MAX_OUTPUT_TOKENS: 2000,
  MAX_CONVERSATION_HISTORY: 20, // Max pesannya ya
}

import type { AIConversation, AIConversationMessage, AIUsage, AIQuota } from '@prisma/client';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ConversationContext {
  conversationId: string;
  context?: string | null;
  summary?: string | null;
  messages: AIConversationMessage[];
}

export interface ChatInput {
  message: string;
  conversationId?: string;
  context?: 'general' | 'education' | 'budgeting' | 'investment' | 'debt' | 'savings';
}

export interface ChatOutput {
  reply: string;
  conversationId: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cached: boolean;
}

export interface FinancialHealthInput {
  period?: 'weekly' | 'monthly' | 'yearly';
}

export interface FinancialHealthOutput {
  score: number;
  label: string;
  color: string;
  breakdown: {
    savingsRate: number;
    expenseRatio: number;
    debtRatio: number;
    emergencyFund: number;
    diversification: number;
  };
  recommendations: string[];
  insights: string;
}

export interface ReceiptScanInput {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ReceiptScanOutput {
  merchantName?: string;
  date?: string;
  total?: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  category?: string;
  suggestedCategory: string;
  confidence: number;
 }>;
  rawText: string;
  confidence: number;
}

//Cash Flow nya

export interface CashFlowPredictionInput {
  months: number;
  includeProjection?: boolean;
}

export interface CashFlowPredictionOutput {
  months: number;
  prediction: string;
  projectedBalance: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  historicalAverage: {
    monthlyIncome: number;
    monthlyExpense: number;
    monthlySavings: number;
 };
  recommendations: string[];
}

//Tax nya 

export interface TaxEstimationInput {
  year?: number;
  incomeSource?: 'salary' | 'freelance' | 'business' | 'mixed';
}

export interface TaxEstimationOutput {
  year: number;
  estimatedTax: number;
  breakdown: {
    grossIncome: number;
    deductions: number;
    taxableIncome: number;
    taxBrackets: Array<{
      bracket: string;
      rate: number;
      amount: number;
 }>;
 };
  recommendations: string;
  disclaimer: string;
}

//Debt 

export interface DebtStrategyInput {
  debts: Array<{
    name: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
 }>;
  strategy: 'snowball' | 'avalanche';
  monthlyBudget: number;
}

export interface DebtStrategyOutput {
  strategy: 'snowball' | 'avalanche';
  strategyName: string;
  strategyDescription: string;
  totalDebt: number;
  totalInterest: number;
  monthsToPayoff: number;
  paymentPlan: Array<{
    month: number;
    payments: Array<{
      debtName: string;
      payment: number;
      remainingBalance: number;
 }>;
    totalPayment: number;
 }>;
  recommendations: string[];
}

// Quota Types
export interface QuotaStatus {
  monthly: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: Date;
 };
  daily: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: Date;
 };
}

export interface UsageStats {
  total: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
 };
  byEndpoint: Array<{
    endpoint: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
 }>;
  byModel: Array<{
    model: string;
    requests: number;
    tokens: number;
 }>;
  period: {
    start: Date;
    end: Date;
 };
}

export interface NarrativeReportInput {
  period: 'weekly' | 'monthly' | 'yearly';
}

export interface FinancialProjectionInput {
  months: number;
}

export interface FinancialAnalysisInput {
  period: 'weekly' | 'monthly' | 'yearly';
}

export interface BudgetOptimizationInput {
  monthlyIncome?: number;
  savingsGoal?: string;
  currency?: 'IDR' | 'USD';
}

export interface AnomalyDetectionInput {
  period: 'weekly' | 'monthly' | 'yearly';
  sensitivity?: 'low' | 'medium' | 'high';
}

export interface SmartCategorizationInput {
  description: string;
  amount?: number;
  vendor?: string;
}

export interface GoalRecommendationInput {
  goalType?: 'emergency_fund' | 'savings' | 'investment' | 'debt_payoff' | 'purchase' | 'general';
  timeframe?: 'short' | 'medium' | 'long' | 'flexible';
}

export interface SpendingInsightsInput {
  depth?: 'basic' | 'standard' | 'deep';
  focus?: 'all' | 'category' | 'time' | 'behavior';

} 

//Pengingat
export const AI_CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 900,     // 15 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;


export const AI_COST_PER_1K_TOKENS = {
  GEMINI_FLASH_INPUT: 0.000075,
  GEMINI_FLASH_OUTPUT: 0.0003,
  GEMINI_PRO_INPUT: 0.000125,
  GEMINI_PRO_OUTPUT: 0.0005,
} as const;


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
} as const;


export const TRANSACTION_CATEGORIES = {
  INCOME: ['salary', 'bonus', 'investment', 'freelance', 'other_income'],
  EXPENSE: [
    'food', 'transport', 'shopping', 'entertainment', 'health',
    'education', 'household', 'bills', 'savings', 'other_expense'
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

//Prompt nya
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
