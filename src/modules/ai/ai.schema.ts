import { z } from "zod";

export const educationChatSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(2000, "Message too long"),
    context: z.enum(["general", "saving", "investing", "budgeting", "debt", "tax", "umkm"]).optional(),
  })
  .strict();

export const narrativeReportSchema = z
  .object({
    period: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
  })
  .strict();

export const financialProjectionSchema = z
  .object({
    months: z.coerce.number().int().min(1).max(24).default(6),
  })
  .strict();

export const financialAnalysisSchema = z
  .object({
    period: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
  })
  .strict();

export type EducationChatInput = z.infer<typeof educationChatSchema>;
export type NarrativeReportInput = z.infer<typeof narrativeReportSchema>;
export type FinancialProjectionInput = z.infer<typeof financialProjectionSchema>;
export type FinancialAnalysisInput = z.infer<typeof financialAnalysisSchema>;