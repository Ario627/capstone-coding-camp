import { z } from "zod";

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

export const budgetOptimizationSchema = z
  .object({
    monthlyIncome: z.coerce.number().positive().optional(),
    savingsGoal: z.string().optional(),
    currency: z.enum(["IDR", "USD"]).default("IDR"),
  })
  .strict();

export const anomalyDetectionSchema = z
  .object({
    period: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
    sensitivity: z.enum(["low", "medium", "high"]).default("medium"),
  })
  .strict();

export const smartCategorizationSchema = z
  .object({
    description: z.string().trim().min(1, "Description is required"),
    amount: z.coerce.number().positive().optional(),
    vendor: z.string().optional(),
  })
  .strict();

export const goalRecommendationSchema = z
  .object({
    goalType: z.enum(["emergency_fund", "savings", "investment", "debt_payoff", "purchase", "general"]).optional(),
    timeframe: z.enum(["short", "medium", "long", "flexible"]).optional(),
  })
  .strict();

export const spendingInsightsSchema = z
  .object({
    depth: z.enum(["basic", "standard", "deep"]).default("standard"),
    focus: z.enum(["all", "category", "time", "behavior"]).default("all"),
  })
  .strict();

export type NarrativeReportInput = z.infer<typeof narrativeReportSchema>;
export type FinancialProjectionInput = z.infer<typeof financialProjectionSchema>;
export type FinancialAnalysisInput = z.infer<typeof financialAnalysisSchema>;
export type BudgetOptimizationInput = z.infer<typeof budgetOptimizationSchema>;
export type AnomalyDetectionInput = z.infer<typeof anomalyDetectionSchema>;
export type SmartCategorizationInput = z.infer<typeof smartCategorizationSchema>;
export type GoalRecommendationInput = z.infer<typeof goalRecommendationSchema>;
export type SpendingInsightsInput = z.infer<typeof spendingInsightsSchema>;
