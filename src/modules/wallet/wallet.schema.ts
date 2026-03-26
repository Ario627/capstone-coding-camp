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
    productCode: z.string().min(1).max(50),
    targetNumber: z
      .string()
      .min(10, "Nomor target minimal 10 digit")
      .max(20, "Nomor target maksimal 20 digit")
      .regex(/^[0-9]+$/, "Nomor target hanya boleh angka"),
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