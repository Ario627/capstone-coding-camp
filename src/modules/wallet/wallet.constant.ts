import {
  WALLET_LIMITS,
  PPOB_PRODUCTS,
  WALLET_TYPE_LABELS,
  WALLET_STATUS_LABELS,
} from "../../common/constants/index.js";
import type { PPOBProduct } from "../../common/constants/index.js";

export {
  WALLET_LIMITS,
  PPOB_PRODUCTS,
  WALLET_TYPE_LABELS,
  WALLET_STATUS_LABELS,
};

export type { PPOBProduct };


export const MIDTRANS_TRANSACTION_STATUS_MAP: Record<
  string,
  "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED" | "REFUNDED"
> = {
  capture: "COMPLETED",
  settlement: "COMPLETED",
  pending: "PENDING",
  deny: "FAILED",
  cancel: "FAILED",
  expire: "EXPIRED",
  refund: "REFUNDED",
  partial_refund: "REFUNDED",
  chargeback: "REFUNDED",
};

export const WALLET_TRANSACTION_MESSAGES = {
  TOP_UP_SUCCESS: "Top up saldo berhasil",
  TOP_UP_PENDING: "Top up saldo sedang diproses",
  TOP_UP_FAILED: "Top up saldo gagal",
  PPOB_SUCCESS: "Pembayaran PPOB berhasil",
  PPOB_FAILED: "Pembayaran PPOB gagal",
  TRANSFER_SUCCESS: "Transfer berhasil",
  TRANSFER_FAILED: "Transfer gagal",
  INSUFFICIENT_BALANCE: "Saldo tidak mencukupi",
  INVALID_AMOUNT: "Nominal tidak valid",
  USER_NOT_FOUND: "User tidak ditemukan",
  RECIPIENT_NOT_FOUND: "Penerima tidak ditemukan",
  CANNOT_TRANSFER_TO_SELF: "Tidak dapat transfer ke diri sendiri",
} as const;

export const WALLET_ERROR_CODES = {
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  INVALID_STATUS: "INVALID_STATUS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  DUPLICATE_TRANSACTION: "DUPLICATE_TRANSACTION",
} as const;

export const ORDER_ID_PREFIX = "WALLET";
export const ORDER_ID_TIMESTAMP_LENGTH = 13;
export const ORDER_ID_RANDOM_LENGTH = 6;