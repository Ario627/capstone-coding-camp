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

export type EducationChatInput = z.infer<typeof educationChatSchema>;
