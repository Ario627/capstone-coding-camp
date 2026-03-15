import { z } from 'zod';

export const initiatePaymentSchema = z
  .object({
    amount: z
      .number()
      .min(100, "Minimal pembayaran Rp 100")
      .max(500_000_000, "Maksimal pembayaran Rp 500.000.000")
      .multipleOf(0.01),
    method: z.enum(["BANK_TRANSFER", "EWALLET", "QRIS", "VIRTUAL_ACCOUNT", "CREDIT_CARD"]),
    currency: z.string().length(3).toUpperCase().default("IDR").optional(),
    description: z
      .string()
      .trim()
      .max(500)
      .regex(/^[a-zA-Z0-9\s.,\-()#/]+$/, "Description contains invalid characters")
      .optional(),
    idempotencyKey: z
      .string()
      .min(16, "Idempotency key must be at least 16 characters")
      .max(64, "Idempotency key must be at most 64 characters")
      .regex(/^[a-zA-Z0-9\-_]+$/, "Idempotency key contains invalid characters"),
  })
  .strict();

export const webhookSchema = z  
  .object({
    external_id: z.string().min(1).max(100),
    status: z.enum(["COMPLETED", "FAILED", "EXPIRED", "REFUNDED"]),
    amount: z.number().positive().optional(),
    paid_at: z.string().datetime().optional(),
  })
  .passthrough();

export const paymentIdParam = z.object({
  id: z.string().min(1).max(100),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;