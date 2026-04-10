import { z } from "zod";
import { WALLET_LIMITS } from "./wallet.constant.js";

export const topUpSchema = z
  .object({
    amount: z
      .number()
      .int("Amount must be integer")
      .min(
        WALLET_LIMITS.MIN_TOP_UP,
        `Minimal top-up Rp ${WALLET_LIMITS.MIN_TOP_UP.toLocaleString("id-ID")}`,
      )
      .max(
        WALLET_LIMITS.MAX_TOP_UP,
        `Maksimal top-up Rp ${WALLET_LIMITS.MAX_TOP_UP.toLocaleString("id-ID")}`,
      ),
    method: z.enum([
      "BANK_TRANSFER",
      "EWALLET",
      "QRIS",
      "VIRTUAL_ACCOUNT",
      "CREDIT_CARD",
    ]),
    idempotencyKey: z
      .string()
      .min(16, "Idempotency key must be at least 16 characters")
      .max(64, "Idempotency key must be at most 64 characters")
      .regex(
        /^[a-zA-Z0-9\-_]+$/,
        "Idempotency key contains invalid characters",
      ),
  })
  .strict();

export const ppobSchema = z
  .object({
    productCode: z.string().min(1, "Kode produk wajib diisi").max(50),
    targetNumber: z
      .string()
      .min(1, "Nomor target wajib diisi")
      .max(50, "Nomor target maksimal 50 karakter")
      .regex(
        /^[a-zA-Z0-9\s\-_.]+$/,
        "Nomor target hanya boleh berisi huruf, angka, spasi, tanda hubung, dan titik",
      ),
    amount: z
      .number()
      .int("Amount must be integer")
      .min(
        WALLET_LIMITS.MIN_TRANSACTION,
        `Minimal transaksi Rp ${WALLET_LIMITS.MIN_TRANSACTION.toLocaleString("id-ID")}`,
      )
      .max(
        WALLET_LIMITS.MAX_TRANSACTION,
        `Maksimal transaksi Rp ${WALLET_LIMITS.MAX_TRANSACTION.toLocaleString("id-ID")}`,
      ),
  })
  .strict();

export const transferSchema = z
  .object({
    recipientUserId: z.string().min(1, "Recipient is required"),
    amount: z
      .number()
      .int("Amount must be integer")
      .min(
        WALLET_LIMITS.MIN_TRANSACTION,
        `Minimal transfer Rp ${WALLET_LIMITS.MIN_TRANSACTION.toLocaleString("id-ID")}`,
      )
      .max(
        WALLET_LIMITS.MAX_TRANSACTION,
        `Maksimal transfer Rp ${WALLET_LIMITS.MAX_TRANSACTION.toLocaleString("id-ID")}`,
      ),
    note: z.string().max(200, "Note maksimal 200 karakter").optional(),
  })
  .strict();

export const lookupQuerySchema = z.object({
  identifier: z
    .string()
    .min(1, "Email wajib diisi")
    .max(255)
    .email("Format email tidak valid"),
});

export const qrisPaymentSchema = z
  .object({
    qrData: z.string().min(1, "Data QR wajib diisi").max(2000),
    amount: z
      .number()
      .int("Amount must be integer")
      .min(
        WALLET_LIMITS.MIN_TRANSACTION,
        `Minimal pembayaran Rp ${WALLET_LIMITS.MIN_TRANSACTION.toLocaleString("id-ID")}`,
      )
      .max(
        WALLET_LIMITS.MAX_TRANSACTION,
        `Maksimal pembayaran Rp ${WALLET_LIMITS.MAX_TRANSACTION.toLocaleString("id-ID")}`,
      ),
    merchantName: z.string().min(1, "Nama merchant wajib diisi").max(200),
    merchantId: z.string().min(1, "ID merchant wajib diisi").max(100),
  })
  .strict();

export const bankTransferSchema = z
  .object({
    bankCode: z.string().min(1).max(20),
    bankName: z.string().min(1).max(100),
    accountNumber: z.string().min(1, "Nomor rekening wajib diisi").max(50),
    accountName: z.string().min(1, "Nama penerima wajib diisi").max(200),
    amount: z
      .number()
      .int("Amount must be integer")
      .min(
        WALLET_LIMITS.MIN_TRANSACTION,
        `Minimal transfer Rp ${WALLET_LIMITS.MIN_TRANSACTION.toLocaleString("id-ID")}`,
      )
      .max(
        WALLET_LIMITS.MAX_TRANSACTION,
        `Maksimal transfer Rp ${WALLET_LIMITS.MAX_TRANSACTION.toLocaleString("id-ID")}`,
      ),
    note: z.string().max(200).optional(),
  })
  .strict();

export const historyQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    type: z
      .enum([
        "TOP_UP",
        "PPOB",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "WITHDRAWAL",
        "REFUND",
        "PAYMENT",
      ])
      .optional(),
    status: z
      .enum([
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "REFUNDED",
      ])
      .optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict();

export const transactionIdParam = z.object({
  id: z.string().min(1, "Transaction ID is required"),
});

export type TopUpInput = z.infer<typeof topUpSchema>;
export type PPOBInput = z.infer<typeof ppobSchema>;
export type TransferInputSchema = z.infer<typeof transferSchema>;
export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;
export type LookupQueryInput = z.infer<typeof lookupQuerySchema>;
export type QRISPaymentInputSchema = z.infer<typeof qrisPaymentSchema>;
export type BankTransferInputSchema = z.infer<typeof bankTransferSchema>;