import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  amount: z.number().min(100).multipleOf(0.01),
  method: z.enum(['BANK_TRANSFER', 'EWALLET', 'QRIS', 'VIRTUAL_ACCOUNT', 'CREDIT_CARD']),
  description: z.string().max(500).optional(),
})
