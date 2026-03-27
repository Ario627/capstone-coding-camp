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

export interface PaymentMethodInfo {
  paymentMethod: string;
  paymentMethodName: string;
}

const VA_BANK_NAMES: Record<string, string> = {
  bca: "BCA",
  bni: "BNI",
  bri: "BRI",
  mandiri: "Mandiri",
  permata: "Permata",
  maybank: "Maybank",
  cimb: "CIMB Niaga",
  danamon: "Danamon",
};

const EWALLET_NAMES: Record<string, string> = {
  gopay: "Gopay",
  shopeepay: "ShopeePay",
  dana: "DANA",
  ovo: "OVO",
  linkaja: "LinkAja",
};

const STORE_NAMES: Record<string, string> = {
  alfamart: "Alfamart",
  indomaret: "Indomaret",
};

const CREDIT_CARD_BANK_NAMES: Record<string, string> = {
  bca: "BCA",
  mandiri: "Mandiri",
  bni: "BNI",
  bri: "BRI",
  cimb: "CIMB Niaga",
  danamon: "Danamon",
  mega: "Mega",
  maybank: "Maybank",
};

export function extractPaymentMethodInfo(
  notification: Record<string, unknown>,
): PaymentMethodInfo {
  const paymentType = notification.payment_type as string | undefined;

  if (!paymentType) {
    return { paymentMethod: "unknown", paymentMethodName: "Unknown" };
  }

  switch (paymentType) {
    case "bank_transfer": {
      const vaNumbers = notification.va_numbers as
        | Array<{ bank: string; va_number: string }>
        | undefined;
      const bank = vaNumbers?.[0]?.bank?.toLowerCase() ?? "unknown";
      const bankName = VA_BANK_NAMES[bank] ?? bank.toUpperCase();
      return {
        paymentMethod: `${bank}_va`,
        paymentMethodName: `${bankName} Virtual Account`,
      };
    }

    case "echannel": {
      return {
        paymentMethod: "mandiri_bill",
        paymentMethodName: "Mandiri Bill Payment",
      };
    }

    case "qris": {
      const issuer = (notification.issuer as string | undefined)?.toLowerCase();
      if (issuer && EWALLET_NAMES[issuer]) {
        return {
          paymentMethod: `qris_${issuer}`,
          paymentMethodName: `QRIS - ${EWALLET_NAMES[issuer]}`,
        };
      }
      return { paymentMethod: "qris", paymentMethodName: "QRIS" };
    }

    case "gopay":
    case "shopeepay":
    case "dana":
    case "ovo":
    case "linkaja": {
      const name = EWALLET_NAMES[paymentType] ?? paymentType.toUpperCase();
      return { paymentMethod: paymentType, paymentMethodName: name };
    }

    case "credit_card": {
      const bank = (notification.bank as string | undefined)?.toLowerCase();
      if (bank && CREDIT_CARD_BANK_NAMES[bank]) {
        return {
          paymentMethod: `credit_card_${bank}`,
          paymentMethodName: `Credit Card - ${CREDIT_CARD_BANK_NAMES[bank]}`,
        };
      }
      return { paymentMethod: "credit_card", paymentMethodName: "Credit Card" };
    }

    case "cstore": {
      const store = (notification.store as string | undefined)?.toLowerCase();
      if (store && STORE_NAMES[store]) {
        return { paymentMethod: store, paymentMethodName: STORE_NAMES[store] };
      }
      return {
        paymentMethod: "cstore",
        paymentMethodName: "Convenience Store",
      };
    }

    default: {
      return {
        paymentMethod: paymentType,
        paymentMethodName:
          paymentType.charAt(0).toUpperCase() +
          paymentType.slice(1).replace(/_/g, " "),
      };
    }
  }
}
