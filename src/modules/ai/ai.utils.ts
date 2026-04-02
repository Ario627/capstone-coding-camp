import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.config.js";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { AI_MODEL, AI_TOKEN_LIMITS } from "./ai.constant.js";
import type { GenerativeModel, Content, Part } from "@google/generative-ai";


export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface ConversationHistory {
  role: 'user' | 'assistant';
  content: string;
}

let ai: GoogleGenerativeAI | null = null;
let cachedApi: string | null = null;

export function getGeminiModel(modelName: string = AI_MODEL.GEMINI_FLASH): GenerativeModel {
    const apiKey = env().GEMINI_API_KEY;

    if(!apiKey) throw new AppError(503, "AI service is not configured");

    if(!ai || cachedApi !== apiKey) {
        ai = new GoogleGenerativeAI(apiKey);
        cachedApi = apiKey;
    }

    return ai.getGenerativeModel({model: modelName});
}

export function estimateToken(txt: string): number {
    if(!txt) return 0;

    return Math.ceil(txt.length / 3.5);
}

export function estimateConversationTokens(message:  Array<{role: string, content: string}>): number {
    let total = 0;

    for(const msg of message) {
        total += estimateToken(msg.content) + 4;
    }

    return total;
}

export async function generateContent(options: GenerateOptions): Promise<GenerateResult> {
    const {
        systemPrompt,
        userPrompt,
        model = AI_MODEL.GEMINI_FLASH,
        maxOutputTokens = AI_TOKEN_LIMITS.MAX_OUTPUT_TOKENS,
        temperature = 0.7,
        topP = 0.95,
        topK = 40,
    } = options;

    const inputTokens = estimateToken(systemPrompt + userPrompt);
    if(inputTokens > AI_TOKEN_LIMITS.MAX_INPUT_TOKENS) {
        return Promise.reject(new AppError(400, `Input exceeds maximum token limit of ${AI_TOKEN_LIMITS.MAX_INPUT_TOKENS}. Estimated tokens: ${inputTokens}`));
    }

    const geminiModel = getGeminiModel(model);

    const contents: Content[] = [
        {
            role: "user",
            parts: [{text: userPrompt}],
        },
    ];

    try {
        const result = await geminiModel.generateContent({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }], role: "system" },
            generationConfig: {
                maxOutputTokens,
                temperature,
                topP,
                topK,
            },
        });

        const response = result.response;
        const text = response.text();

        const outputTokens = estimateToken(text);

        return {
            text,
            inputTokens,
            outputTokens,
            model,
        };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(500, `AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

