
import type { EducationContext } from '../ai/ai.types.js';
import type { UserDisplayType } from './education.constant.js';


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
};

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
  provider: 'groq' | 'gemini';
}

export interface DailyTipOutput {
  id: string;
  title: string;
  content: string;
  category: string;
  isRead: boolean;
  readAt: Date | null;
}


export interface LearningModuleOutput {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  difficulty: string;
  duration: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  order: number;
}

export interface LearningModuleDetailOutput extends LearningModuleOutput {
  content: string;
}

export interface ModuleReadOutput {
  success: boolean;
  moduleId: string;
  readAt: Date;
}


export interface TerminologyOutput {
  id: string;
  term: string;
  slug: string;
  definition: string;
  category: string;
  examples: Array<{ title: string; description: string }> | null;
  relatedTerms: string[];
}


export function getUserDisplayType(userType: 'user' | 'admin', hasBusiness: boolean): UserDisplayType {
  if (userType === 'admin') return 'admin';
  if (hasBusiness) return 'user_umkm';
  return 'user_personal';
}