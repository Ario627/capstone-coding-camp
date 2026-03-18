import { z } from "zod";

export const educationChatSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(2000, 'Message too long (max 2000 characters)'),
    context: z
      .enum(['general', 'saving', 'investing', 'budgeting', 'debt', 'tax', 'umkm'])
      .optional()
      .default('general'),
    conversationId: z
      .string()
      .optional(),
  })
  .strict();

export type EducationChatInput = z.infer<typeof educationChatSchema>;

export const dailyTipsSchema = z
  .object({
    category: z
      .enum(['saving', 'budgeting', 'investing', 'debt', 'umkm', 'tax', 'digital_payment', 'emergency_fund'])
      .optional(),
  })
  .strict();

export type DailyTipsInput = z.infer<typeof dailyTipsSchema>;


export const learningModulesSchema = z
  .object({
    category: z
      .enum(['financial_basics', 'budgeting', 'saving', 'investing', 'debt_management', 'umkm_finance', 'tax_basics', 'digital_finance'])
      .optional(),
    difficulty: z
      .enum(['beginner', 'intermediate', 'advanced'])
      .optional(),
    page: z
      .coerce
      .number()
      .int()
      .min(1)
      .optional()
      .default(1),
    limit: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10),
  })
  .strict();

export type LearningModulesInput = z.infer<typeof learningModulesSchema>;

export const moduleReadSchema = z
  .object({
    moduleId: z
      .string()
      .min(1, 'Module ID is required'),
  })
  .strict();

export type ModuleReadInput = z.infer<typeof moduleReadSchema>;


export const terminologyListSchema = z
  .object({
    category: z
      .enum(['general', 'investment', 'banking', 'tax', 'insurance', 'umkm'])
      .optional(),
    search: z
      .string()
      .trim()
      .max(100, 'Search query too long')
      .optional(),
    page: z
      .coerce
      .number()
      .int()
      .min(1)
      .optional()
      .default(1),
    limit: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(20),
  })
  .strict();

export type TerminologyListInput = z.infer<typeof terminologyListSchema>;


export const moduleIdSchema = z
  .object({
    id: z
      .string()
      .min(1, 'Module ID is required'),
  })
  .strict();

export const terminologySlugSchema = z
  .object({
    slug: z
      .string()
      .min(1, 'Terminology slug is required'),
  })
  .strict();

export type ModuleIdInput = z.infer<typeof moduleIdSchema>;
export type TerminologySlugInput = z.infer<typeof terminologySlugSchema>;