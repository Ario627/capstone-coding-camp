

export type AIProviderType = 'groq' | 'gemini';
export type EducationContext = 'general' | 'saving' | 'investing' | 'budgeting' | 'debt' | 'tax' | 'umkm';
export type PeriodType = 'weekly' | 'monthly' | 'yearly';
export type DepthLevel = 'basic' | 'standard' | 'deep';
export type FocusType = 'all' | 'category' | 'time' | 'behavior';
export type GoalType = 'emergency_fund' | 'savings' | 'investment' | 'debt_payoff' | 'purchase' | 'general';
export type TimeframeType = 'short' | 'medium' | 'long' | 'flexible';
export type SensitivityLevel = 'low' | 'medium' | 'high';
export type CurrencyType = 'IDR' | 'USD';

//conversation

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ConversationContext {
  conversationId: string;
  context?: EducationContext | null;
  summary?: string | null;
  messages: ConversationMessage[];
}

// EDUCATION CHAT TYPES NYA 

export interface EducationChatInput {
  message: string;
  context?: EducationContext;
  conversationId?: string;
}

export interface EducationChatOutput {
  reply: string;
  conversationId: string;
  context: EducationContext;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  provider: AIProviderType;
  cached: boolean;
}

// USER CONTEXT nya 

export interface UserContext {
  userType: 'user' | 'admin';       
  hasBusiness: boolean;             
  balanceSummary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    savingsRate: number;
    period: string;
  };
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
    createdAt: Date;
  }>;
}

// --- IGNORE ---

export interface NarrativeReportInput {
  period: PeriodType;
}

export interface NarrativeReportOutput {
  period: PeriodType;
  report: string;
  stats: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
  };
}

export interface FinancialProjectionInput {
  months: number;
}

export interface FinancialProjectionOutput {
  months: number;
  projection: string;
  historicalStats: {
    totalIncome: number;
    totalExpense: number;
    avgMonthlyIncome: number;
    avgMonthlyExpense: number;
  };
}

export interface FinancialAnalysisInput {
  period: PeriodType;
}

export interface FinancialAnalysisOutput {
  period: PeriodType;
  analysis: string;
  stats: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    savingsRate: number;
    transactionCount: number;
    incomeCategories: Record<string, number>;
    expenseCategories: Record<string, number>;
  };
}

export interface BudgetOptimizationInput {
  monthlyIncome?: number;
  savingsGoal?: string;
  currency?: CurrencyType;
}

export interface BudgetOptimizationOutput {
  monthlyIncome: number;
  recommendation: string;
  suggestedAllocation: {
    needs: number;
    wants: number;
    savings: number;
  };
}

export interface AnomalyDetectionInput {
  period: PeriodType;
  sensitivity?: SensitivityLevel;
}

export interface AnomalyDetectionOutput {
  period: PeriodType;
  anomalies: Array<{
    amount: number;
    category: string;
    description: string;
    date: Date;
    expectedRange: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  anomalyCount: number;
}

export interface SmartCategorizationInput {
  description: string;
  amount?: number;
  vendor?: string;
}

export interface SmartCategorizationOutput {
  description: string;
  suggestedCategory: string;
  confidence: number;
  alternatives: string[];
  isCustom: boolean;
}

export interface GoalRecommendationInput {
  goalType?: GoalType;
  timeframe?: TimeframeType;
}

export interface GoalRecommendationOutput {
  recommendations: string;
  financialSnapshot: {
    avgMonthlyIncome: number;
    avgMonthlySavings: number;
    currentGoalCount: number;
    savingsRate: number;
  };
}

export interface SpendingInsightsInput {
  depth?: DepthLevel;
  focus?: FocusType;
}

export interface SpendingInsightsOutput {
  insights: string;
  patterns: {
    topCategories: Array<{
      name: string;
      total: number;
      count: number;
      avgPerTransaction: number;
    }>;
    peakSpendingDay: string;
    peakSpendingHour: string;
    avgTransactionAmount: number;
  };
  summary: {
    totalTransactions: number;
    totalSpent: number;
    uniqueCategories: number;
  };
}


export interface FinancialHealthInput {
  period?: PeriodType;
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
  byProvider: Array<{
    provider: AIProviderType;
    requests: number;
    tokens: number;
  }>;
  period: {
    start: Date;
    end: Date;
  };
}


export interface ProviderGenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: AIProviderType;
}

export interface ProviderStatus {
  groq: boolean;
  gemini: boolean;
  primary: 'groq' | 'gemini' | 'none';
}