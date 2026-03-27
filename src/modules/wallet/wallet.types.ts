import type {
  WalletTransactionType,
  WalletTransactionStatus,
  PaymentMethod,
} from "@prisma/client";

export interface TopUpInput {
  amount: number;
  method: PaymentMethod;
  idempotencyKey: string;
}

export interface TopUpResult {
  paymentId: string;
  orderId: string;
  snapToken: string;
  redirectUrl?: string;
  amount: number;
  expiresAt: Date;
  status: WalletTransactionStatus;
  walletTransactionId: string;
}

export interface PPOBInput {
  productCode: string;
  targetNumber: string;
  amount: number;
}

export interface PPOBResult {
  transactionId: string;
  receiptNumber: string;
  productCode: string;
  targetNumber: string;
  amount: number;
  status: WalletTransactionStatus;
  message: string;
}

export interface TransferInput {
  recipientUserId: string;
  amount: number;
  note?: string;
}

export interface TransferResult {
  senderTransactionId: string;
  recipientTransactionId: string;
  amount: number;
  status: WalletTransactionStatus;
  recipientId: string;
}

export interface ProcessWalletTransactionInput {
  userId: string;
  type: WalletTransactionType;
  amount: number;
  description?: string;
  referenceId?: string;
  paymentTransactionId?: string;
  recipientUserId?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessWalletTransactionResult {
  walletTransactionId: string;
  transactionId: string;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
}

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface WalletHistoryItem {
  id: string;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
  description: string | null;
  createdAt: Date;
}

export interface WalletHistoryQuery {
  page: number;
  limit: number;
  type?: WalletTransactionType;
  status?: WalletTransactionStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_id: string;
  transaction_status: string;
  transaction_time: string;
  payment_type: string;
  fraud_status?: string;
  [key: string]: unknown;
}

export interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

export interface PPOBProduct {
  code: string;
  name: string;
  category: string;
  provider: string;
  amount: number;
  fee: number;
  minAmount: number;
  maxAmount: number;
}
