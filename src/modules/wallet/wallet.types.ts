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
  baseAmount: number;
  adminFee: number;
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
  referenceId: string | null;
  paymentMethod: string | null;
  paymentMethodName: string | null;
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

export interface WalletTransactionDetail {
  transactionId: string;
  referenceId: string | null;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
  description: string | null;
  paymentMethod: string | null;
  paymentMethodName: string | null;
  recipientUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
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
  va_numbers?: Array<{ bank: string; va_number: string }>;
  bill_key?: string;
  biller_code?: string;
  issuer?: string;
  store?: string;
  bank?: string;
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

export interface PaymentMethodInfo {
  paymentMethod: string;
  paymentMethodName: string;
}

export interface QRISPaymentInput {
  qrData: string;
  amount: number;
  merchantName: string;
  merchantId: string;
}

export interface QRISPaymentResult {
  transactionId: string;
  walletTransactionId: string;
  amount: number;
  merchantName: string;
  merchantId: string;
  receiptNumber: string;
  status: "COMPLETED";
  message: string;
}

export interface BankTransferInput {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  note?: string;
}

export interface BankTransferResult {
  transactionId: string;
  walletTransactionId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  receiptNumber: string;
  status: "COMPLETED";
  message: string;
}

export interface UserLookupResult {
  id: string;
  fullName: string | null;
  email: string;
}
