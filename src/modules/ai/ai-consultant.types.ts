import type { AIProviderType } from './ai.types.js';

// Consultant context
export type ConsultantContext = 'general' | 'budget' | 'investment' | 'debt' | 'business';
export type DocumentType = 'bank_statement' | 'invoice' | 'receipt' | 'financial_report' | 'unknown';

// Chat input/output
export interface ConsultantChatInput {
  message: string;
  conversationId?: string;
  context?: ConsultantContext;
}

export interface ConsultantChatOutput {
  reply: string;
  conversationId: string;
  context: ConsultantContext;
  tokens: { input: number; output: number; total: number };
  provider: AIProviderType;
  quotaRemaining: { daily: number; monthly: number };
}

export interface ConsultantFileChatInput extends ConsultantChatInput {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface ConsultantFileChatOutput extends ConsultantChatOutput {
  documentContext: {
    fileName: string;
    fileType: 'pdf' | 'excel';
    detectedType: DocumentType;
    summary: string;
  };
}

// Conversation types
export interface ConsultantConversation {
  id: string;
  userId: string;
  context: ConsultantContext | null;
  summary: string | null;
  isActive: boolean;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsultantConversationDetail extends ConsultantConversation {
  messages: ConsultantMessage[];
}

export interface ConsultantMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  tokens: number;
  model: string | null;
  createdAt: Date;
}

// User financial context (dipakai di context builder)
export interface UserFinancialContext {
  profile: {
    userType: 'personal' | 'umkm' | 'admin';
    joinedAt: Date;
    hasBusiness: boolean;
    streakDays: number;
  };
  financialSummary: {
    period: string;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    savingsRate: number;
    transactionCount: number;
  };
  categoryBreakdown: {
    income: Array<{ category: string; amount: number; percentage: number; count: number }>;
    expense: Array<{ category: string; amount: number; percentage: number; count: number }>;
  };
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  recentTransactions: Array<{
    date: Date;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
  }>;
  paymentSummary?: {
    totalPayments: number;
    totalAmount: number;
    successRate: number;
    preferredMethod: string;
  };
  businessData?: {
    name: string;
    type: string;
    inventoryCount: number;
    inventoryValue: number;
  };
  educationProgress: {
    modulesCompleted: number;
    totalModules: number;
    lastActivity: Date | null;
  };
}

// Document context (dipakai di file parser)
export interface DocumentContext {
  fileName: string;
  fileType: 'pdf' | 'excel';
  detectedType: DocumentType;
  extractedContent: string;
  summary: {
    pagesOrRows: number;
    dateRange?: { start: Date; end: Date };
    totalAmounts?: Array<{ label: string; amount: number }>;
  };
}

// Quota types
export interface QuotaCheck {
  allowed: boolean;
  reason?: 'daily_exhausted' | 'monthly_exhausted';
  remaining: { daily: number; monthly: number };
}

export interface QuotaStatus {
  daily: { limit: number; used: number; remaining: number; resetsAt: Date };
  monthly: { limit: number; used: number; remaining: number; resetsAt: Date };
}

// Error codes
export type ConsultantErrorCode =
  | 'QUOTA_EXHAUSTED_DAILY'
  | 'QUOTA_EXHAUSTED_MONTHLY'
  | 'RATE_LIMIT_EXCEEDED'
  | 'TOKEN_BUDGET_EXCEEDED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'FILE_PARSE_ERROR'
  | 'CONVERSATION_NOT_FOUND'
  | 'CONVERSATION_ACCESS_DENIED'
  | 'CONVERSATION_LIMIT_EXCEEDED'
  | 'PROMPT_INJECTION_DETECTED'
  | 'MESSAGE_TOO_LONG'
  | 'INVALID_INPUT';