import {z} from 'zod';

export const consultantChatSchema = z.object({
    message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
    conversationId: z.string().optional(),
    context: z.enum(['general', 'budget', 'investment', 'debt', 'business']).optional().default('general'),
}).strict();

export const consultantFileChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Pesan tidak boleh kosong')
    .max(2000, 'Pesan maksimal 2000 karakter'),
  conversationId: z
    .string()
    .optional(),
  context: z
    .enum(['general', 'budget', 'investment', 'debt', 'business'])
    .optional()
    .default('general'),
}).strict();

export const conversationListSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    isActive: z.coerce.boolean().optional(),
}).strict();


export const conversationIdSchema = z.object({
    id: z.string().min(1, 'Conversation ID is required')
}).strict();

export const fileUploadValidation = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/x-excel',
    'application/x-msexcel',
  ],
  allowedExtensions: ['.pdf', '.xlsx', '.xls'],
};

export type ConsultantChatInput = z.infer<typeof consultantChatSchema>;
export type ConversationListInput = z.infer<typeof conversationListSchema>;
export type ConversationIdInput = z.infer<typeof conversationIdSchema>;