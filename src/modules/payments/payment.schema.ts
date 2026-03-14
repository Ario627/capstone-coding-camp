import { z } from 'zod';

export const initiatePaymentSchema = z
  .object({
    amount: z.number().min(100, "Minimal pembayaran Rp 100").multipleOf(0.01),
    method: z.enum(["BANK_TRANSFER", "EWALLET", "QRIS", "VIRTUAL_ACCOUNT", "CREDIT_CARD"]),
    description: z.string().trim().max(500).optional(),
  })
  .strict();

export const webhookSchema = z  
  .object({
    external_id: z.string().min(1),
    status: z.string().min(1),
    amount: z.number().optional(),
    paid_at: z.string().optional(),
  })
  .catchall(z.unknown());

export const paymentIdParam = z.object({
  id: z.string().min(1),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;