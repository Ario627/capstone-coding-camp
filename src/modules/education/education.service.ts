import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.config.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import type {
  EducationChatInput,
  LearningModuleInput,
  FinancialQuizInput,
  DailyTipsInput,
  ScenarioLearningInput,
  TerminologyInput,
  VideoRecommendationInput,
} from "./education.schema.js";

function getModel() {
  const apiKey = env().GEMINI_API_KEY;
  if (!apiKey) throw new AppError(503, "AI service is not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}


export async function educationChat(userId: string, dto: EducationChatInput) {
  const model = getModel();

  const systemPrompt = `Kamu adalah asisten edukasi keuangan bernama FinGrow AI.
Kamu membantu pengguna memahami literasi keuangan dengan bahasa yang mudah dipahami, dalam Bahasa Indonesia.
Topik yang bisa kamu bahas: tabungan, investasi, budgeting, utang, pajak, keuangan UMKM.
Jawab dengan ringkas, praktis, dan berikan contoh nyata jika memungkinkan.
Jangan memberikan saran investasi spesifik atau rekomendasi produk keuangan tertentu.
${dto.context ? `Fokus pada topik: ${dto.context}` : ""}`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: dto.message },
  ]);

  const response = result.response.text();

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_EDUCATION_CHAT",
      entity: "AI",
      entityId: null,
      after: { context: dto.context ?? "general" } as object,
    },
  });

  return { reply: response, context: dto.context ?? "general" };
}
