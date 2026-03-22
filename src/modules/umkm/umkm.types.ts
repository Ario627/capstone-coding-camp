import type { Decimal } from "@prisma/client/runtime/library";

export interface Business {
  id: string;
  userId: string;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface BusinessWithStats extends Business {
  _count?: {
    inventoryItems: number;
    businessTransactions: number;
  };
}

export interface BusinessWithInventory extends Business {
  inventoryItems: InventoryItem[];
}

export interface CreateBusinessInput {
  name: string;
  type: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
  category?: string | null;
}

export interface UpdateBusinessInput {
  name?: string;
  type?: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
  category?: string | null;
  isActive?: boolean;
}

export interface BusinessListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
}

export interface BusinessTransaction {
  id: string;
  businessId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  transactionDate: Date;
  paymentMethod: string | null;
  notes: string | null;
  receiptUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateBusinessTransactionInput {
  businessId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  transactionDate?: Date | string;
  paymentMethod?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
}

export interface UpdateBusinessTransactionInput {
  type?: 'income' | 'expense';
  amount?: number;
  category?: string;
  description?: string;
  transactionDate?: Date | string;
  paymentMethod?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
}

export interface BusinessTransactionListQuery {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  category?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  paymentMethod?: string;
}

export interface BusinessTransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
  incomeByCategory: Array<{
    category: string;
    total: number;
    count: number;
  }>;
  expenseByCategory: Array<{
    category: string;
    total: number;
    count: number;
  }>;
}


export interface InventoryItem {
  id: string;
  businessId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: Decimal;
  costPrice: Decimal;
  unit: string;
  minStock: number;
  maxStock: number | null;
  imageUrl: string | null;
  barcode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface InventoryItemWithValue extends InventoryItem {
  retailValue: number;
  costValue: number;
  margin: number;
  stockStatus: 'low' | 'optimal' | 'overstock';
}

export interface CreateInventoryInput {
  businessId: string;
  name: string;
  sku?: string | null;
  quantity?: number;
  unitPrice: number | string;
  costPrice?: number | string | null;
  unit?: string;
  minStock?: number;
  maxStock?: number | null;
  imageUrl?: string | null;
  barcode?: string | null;
}

export interface UpdateInventoryInput {
  name?: string;
  sku?: string | null;
  quantity?: number;
  unitPrice?: number | string;
  costPrice?: number | string | null;
  unit?: string;
  minStock?: number;
  maxStock?: number | null;
  imageUrl?: string | null;
  barcode?: string | null;
  isActive?: boolean;
}

export interface AdjustStockInput {
  adjustment: number; 
  reason?: string;
}

export interface InventoryListQuery {
  page?: number;
  limit?: number;
  search?: string;
  lowStock?: boolean;
  isActive?: boolean;
}

export interface InventoryValuation {
  business: {
    id: string;
    name: string;
  };
  summary: {
    totalItems: number;
    uniqueProducts: number;
    totalRetailValue: string;
    totalCostValue: string;
    totalMargin: string;
    lowStockCount: number;
  };
  items: InventoryItemWithValue[];
}

//Report types
export interface BusinessReportPeriod {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface BusinessFinancialSummary {
  business: {
    id: string;
    name: string;
    type: string;
    category: string | null;
  };
  period: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  transactions: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    incomeCount: number;
    expenseCount: number;
    incomeByCategory: Array<{ category: string; total: number; count: number }>;
    expenseByCategory: Array<{ category: string; total: number; count: number }>;
  };
  inventory: {
    totalItems: number;
    totalQuantity: number;
    totalRetailValue: number;
    totalCostValue: number;
    totalMargin: number;
  };
}

export interface BusinessNarrativeReportInput {
  businessId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  includeInventory?: boolean;
}

export interface BusinessNarrativeReportResult {
  businessId: string;
  businessName: string;
  period: string;
  report: string;
  stats: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    transactionCount: number;
    inventoryValue?: number;
    inventoryMargin?: number;
  };
  generatedAt: Date;
}

export interface PaginatedResult<T> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  timestamp: string;
  path: string;
}

export interface UMKMAuditLog {
  userId: string;
  action: string;
  entity: 'Business' | 'BusinessTransaction' | 'InventoryItem';
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

//analytics Types 
export interface ChartDataPoint {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryBreakdown {
  category: string;
  categoryLabel: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface BusinessTrend {
  dates: string[];
  income: number[];
  expense: number[];
  balance: number[];
}

export interface BusinessAnalytics {
  trend: BusinessTrend;
  topIncomeCategories: CategoryBreakdown[];
  topExpenseCategories: CategoryBreakdown[];
  profitMargin: number;
  avgDailySpending: number;
  avgDailyIncome: number;
}