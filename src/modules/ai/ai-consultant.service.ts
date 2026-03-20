import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { generateWithFallback, estimateToken } from "./ai.provider.js";
import {
  CONSULTANT_SYSTEM_PROMPT,
  CONSULTANT_TOKEN_BUDGET,
  CONSULTANT_CONVERSATION_LIMITS,
  CONSULTANT_MODEL_CONFIG,
} from "./ai-consultant.constant.js";
import {
  incrementUsage,
  logUsage,
  checkQuota,
} from "./ai-consultant-quota.service.js";
import {
  buildUserFinancialContext,
  formatContextForPrompt,
} from "./ai-consultant-context.service.js";
import { parseFile, validateFile } from "./ai-consultant-file.service.js";
import {
  validateMessage,
  estimatePromptTokens,
  sanitizeInput,
  detectPromptInjection,
  buildHistoryString,
  buildDocumentContextString,
} from "../../common/utils/ai-consultant-security.util.js";
import type {
  ConsultantChatInput,
  ConsultantChatOutput,
  ConsultantFileChatInput,
  ConsultantFileChatOutput,
  ConsultantConversation,
  ConsultantConversationDetail,
  ConsultantMessage,
  ConsultantContext,
  UserFinancialContext,
  DocumentContext,
} from "./ai-consultant.types.js";

async function saveMessage(
  conversationId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
  tokens: number,
  model: string | null,
): Promise<void> {
  await prisma.aIConversationMessage.create({
    data: {
      conversationId,
      role,
      content,
      tokens,
      model,
    },
  });
}

async function getConversation(
  conversationId: string,
  userId: string,
): Promise<{ id: string } | null> {
  return prisma.aIConversation.findFirst({
    where: { id: conversationId, userId, isActive: true },
    select: { id: true },
  });
}

async function getRemainingQuota(
  userId: string,
): Promise<{ daily: number; monthly: number }> {
  const quota = await checkQuota(userId);
  return quota.remaining;
}

export async function chat(
  userId: string,
  input: ConsultantChatInput,
): Promise<ConsultantChatOutput> {
  // Validate message
  const validation = validateMessage(input.message);
  if (!validation.valid) {
    throw new AppError(400, validation.error!, { code: "INVALID_INPUT" });
  }

  // Check quota
  const quotaCheck = await checkQuota(userId);
  if (!quotaCheck.allowed) {
    const code =
      quotaCheck.reason === "daily_exhausted"
        ? "QUOTA_EXHAUSTED_DAILY"
        : "QUOTA_EXHAUSTED_MONTHLY";
    throw new AppError(
      429,
      code === "QUOTA_EXHAUSTED_DAILY"
        ? "Quota harian Anda telah habis."
        : "Quota bulanan Anda telah habis.",
      { code },
    );
  }

  // Sanitize input
  const sanitizedMessage = sanitizeInput(input.message);

  // Get or create conversation
  let conversation: { id: string };
  let history: ConsultantMessage[] = [];

  if (input.conversationId) {
    const existing = await getConversation(input.conversationId, userId);
    if (!existing) {
      throw new AppError(404, "Percakapan tidak ditemukan.", {
        code: "CONVERSATION_NOT_FOUND",
      });
    }
    conversation = { id: existing.id };
    history = await getConversationHistory(existing.id);
  } else {
    conversation = await createConversation(userId, input.context);
  }

  // Build user context
  const userContext = await buildUserFinancialContext(userId);
  const contextString = formatContextForPrompt(userContext);

  // Build history string
  const historyForPrompt = history.map((h) => ({
    role: h.role,
    content: h.content,
  }));
  const historyString = buildHistoryString(
    historyForPrompt as Array<{ role: "user" | "assistant"; content: string }>,
  );

  // Build complete prompt
  const systemPrompt = buildSystemPrompt(contextString, "", historyString);

  // Estimate tokens
  const tokenEst = estimatePromptTokens(
    systemPrompt,
    contextString,
    "",
    historyForPrompt,
    sanitizedMessage,
  );

  if (!tokenEst.withinBudget) {
    throw new AppError(
      400,
      "Pesan dan riwayat terlalu panjang. Mulai percakapan baru.",
      { code: "TOKEN_BUDGET_EXCEEDED" },
    );
  }

  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    { role: "system", content: systemPrompt },
    ...historyForPrompt
      .slice(-CONSULTANT_CONVERSATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION)
      .map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
    { role: "user", content: sanitizedMessage },
  ];

  try {
    // Call AI
    const result = await generateWithFallback({
      messages,
      model: CONSULTANT_MODEL_CONFIG.PRIMARY_MODEL,
      temperature: CONSULTANT_MODEL_CONFIG.TEMPERATURE,
      maxOutputTokens: CONSULTANT_MODEL_CONFIG.MAX_OUTPUT_TOKENS,
    });

    // Save messages to DB
    await saveMessage(
      conversation.id,
      userId,
      "user",
      sanitizedMessage,
      0,
      null,
    );
    await saveMessage(
      conversation.id,
      userId,
      "assistant",
      result.text,
      result.outputTokens,
      result.model,
    );

    // Update usage
    await incrementUsage(userId);
    await logUsage(userId, {
      model: result.model,
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      conversationId: conversation.id,
      hasFile: false,
    });

    // Get remaining quota
    const remaining = await getRemainingQuota(userId);

    return {
      reply: result.text,
      conversationId: conversation.id,
      context: input.context ?? "general",
      tokens: {
        input: result.inputTokens,
        output: result.outputTokens,
        total: result.inputTokens + result.outputTokens,
      },
      provider: result.provider,
      quotaRemaining: remaining,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new AppError(500, `AI error: ${msg}`, { code: "AI_PROVIDER_ERROR" });
  }
}

export async function getQuotaStatus(userId: string) {
  const { checkQuota } = await import("./ai-consultant-quota.service.js");
  return checkQuota(userId);
}

async function createConversation(
  userId: string,
  context?: string,
): Promise<{ id: string }> {
  // Check active conversations limit
  const activeCount = await prisma.aIConversation.count({
    where: { userId, isActive: true },
  });

  if (activeCount >= CONSULTANT_CONVERSATION_LIMITS.MAX_ACTIVE_CONVERSATIONS) {
    throw new AppError(
      400,
      "Terlalu banyak percakapan aktif. Hapus beberapa percakapan lama.",
      {
        code: "TOO_MANY_CONVERSATIONS",
      },
    );
  }

  const conversation = await prisma.aIConversation.create({
    data: {
      userId,
      context: context ?? "general",
      isActive: true,
    },
    select: { id: true },
  });

  return conversation;
}

async function getConversationHistory(
  conversationId: string,
): Promise<ConsultantMessage[]> {
  const messages = await prisma.aIConversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      conversationId: true,
      role: true,
      content: true,
      tokens: true,
      model: true,
      createdAt: true,
    },
  });

  return messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    role: m.role as "user" | "assistant",
    content: m.content,
    tokens: m.tokens,
    model: m.model,
    createdAt: m.createdAt,
  }));
}

function buildSystemPrompt(
  userContext: string,
  documentContext: string,
  historyContext: string,
): string {
  let prompt = CONSULTANT_SYSTEM_PROMPT;

  prompt = prompt.replace("{{USER_FINANCIAL_CONTEXT}}", userContext);
  prompt = prompt.replace(
    "{{DOCUMENT_CONTEXT}}",
    documentContext || "Tidak ada dokumen yang diupload.",
  );
  prompt = prompt.replace(
    "{{CONVERSATION_HISTORY}}",
    historyContext || "Ini adalah awal percakapan.",
  );

  return prompt;
}



export async function chatWithFile(
  userId: string,
  input: ConsultantFileChatInput
): Promise<ConsultantFileChatOutput> {
  const fileValidate = validateFile({
    buffer: input.fileBuffer,
    mimetype: input.mimeType,
    originalname: input.fileName,
    size: input.fileSize,
  });

  if (!fileValidate.valid)
    throw new AppError(400, fileValidate.error!, { code: "INVALID_FILE_TYPE" });

  const validation = validateMessage(input.message);
  if (!validation.valid) {
    throw new AppError(400, validation.error!, { code: "INVALID_INPUT" });
  }

  const quotaCheck = await checkQuota(userId);
  if (!quotaCheck.allowed) {
    const code =
      quotaCheck.reason === "daily_exhausted"
        ? "QUOTA_EXHAUSTED_DAILY"
        : "QUOTA_EXHAUSTED_MONTHLY";
    throw new AppError(
      429,
      code === "QUOTA_EXHAUSTED_DAILY"
        ? "Quota harian Anda telah habis."
        : "Quota bulanan Anda telah habis.",
      { code },
    );
  }
  const documentContext = await parseFile(
    input.fileBuffer,
    input.fileName,
    input.mimeType,
  );

  const docString = buildDocumentContextString({
    fileName: documentContext.fileName,
    fileType: documentContext.fileType,
    detectedType: documentContext.detectedType,
    extractedContent: documentContext.extractedContent,
  });

  let conversation: { id: string };
  let history: ConsultantMessage[] = [];

  if (input.conversationId) {
    const existing = await getConversation(input.conversationId, userId);
    if (!existing)
      throw new AppError(404, "Percakapan tidak ditemukan.", {
        code: "CONVERSATION_NOT_FOUND",
      });

    conversation = { id: existing.id };
    history = await getConversationHistory(existing.id);
  } else {
    conversation = await createConversation(userId, input.context);
  }

  const userContext = await buildUserFinancialContext(userId);
  const context = formatContextForPrompt(userContext);

  const historyPrompt = history.map((h) => ({
    role: h.role,
    content: h.content,
  }));
  const historyString = buildHistoryString(
    historyPrompt as Array<{ role: "user" | "assistant"; content: string }>,
  );

  const systemPrompt = buildSystemPrompt(context, docString, historyString);

  const sanitizedMessage = sanitizeInput(input.message);
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    { role: "system", content: systemPrompt },
    ...historyPrompt
      .slice(-CONSULTANT_CONVERSATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION)
      .map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
    { role: "user", content: sanitizedMessage },
  ];

  try {
    const result = await generateWithFallback({
      messages,
      model: CONSULTANT_MODEL_CONFIG.PRIMARY_MODEL,
      temperature: CONSULTANT_MODEL_CONFIG.TEMPERATURE,
      maxOutputTokens: CONSULTANT_MODEL_CONFIG.MAX_OUTPUT_TOKENS,
    });

    // Save messages
    await saveMessage(
      conversation.id,
      userId,
      "user",
      sanitizedMessage,
      0,
      null,
    );
    await saveMessage(
      conversation.id,
      userId,
      "assistant",
      result.text,
      result.outputTokens,
      result.model,
    );

    // Update usage
    await incrementUsage(userId);
    await logUsage(userId, {
      model: result.model,
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      conversationId: conversation.id,
      hasFile: true,
    });

    const remaining = await getRemainingQuota(userId);

    return {
      reply: result.text,
      conversationId: conversation.id,
      context: input.context ?? "general",
      tokens: {
        input: result.inputTokens,
        output: result.outputTokens,
        total: result.inputTokens + result.outputTokens,
      },
      provider: result.provider,
      quotaRemaining: remaining,
      documentContext: {
        fileName: documentContext.fileName,
        fileType: documentContext.fileType,
        detectedType: documentContext.detectedType,
        summary: `Dokumen ${documentContext.fileType} dengan ${documentContext.summary.pagesOrRows} ${documentContext.fileType === "pdf" ? "halaman" : "baris"}`,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new AppError(500, `AI error: ${msg}`, { code: "AI_PROVIDER_ERROR" });
  }
}

export async function listConversations(
  userId: string,
  page: number = 1,
  limit: number = 10,
  isActive?: boolean,
): Promise<{
  conversations: ConsultantConversation[];
  total: number;
  page: number;
  limit: number;
}> {
  const skip = (page - 1) * limit;

  const where: { userId: string; isActive?: boolean } = { userId };
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [conversations, total] = await Promise.all([
    prisma.aIConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        userId: true,
        context: true,
        summary: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        messages: { select: { id: true } },
      },
    }),
    prisma.aIConversation.count({ where }),
  ]);

  return {
    conversations: conversations.map((c) => ({
      id: c.id,
      userId: c.userId,
      context: c.context as ConsultantContext | null,
      summary: c.summary as string | null,
      isActive: c.isActive,
      messageCount: c.messages.length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    total,
    page,
    limit,
  };
}

// Get conversation detail
export async function getConversationDetail(
  conversationId: string,
  userId: string,
): Promise<ConsultantConversationDetail | null> {
  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    select: {
      id: true,
      userId: true,
      context: true,
      summary: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          conversationId: true,
          role: true,
          content: true,
          tokens: true,
          model: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    userId: conversation.userId,
    context: conversation.context as ConsultantContext | null,
    summary: conversation.summary as string | null,
    isActive: conversation.isActive,
    messageCount: conversation.messages.length,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role as "user" | "assistant",
      content: m.content,
      tokens: m.tokens,
      model: m.model,
      createdAt: m.createdAt,
    })),
  };
}

// Delete conversation
export async function deleteConversation(
  conversationId: string,
  userId: string,
): Promise<void> {
  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });

  if (!conversation) {
    throw new AppError(404, "Percakapan tidak ditemukan.", {
      code: "CONVERSATION_NOT_FOUND",
    });
  }

  // Soft delete by setting isActive to false
  await prisma.aIConversation.update({
    where: { id: conversationId },
    data: { isActive: false },
  });
}
