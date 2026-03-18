import Groq from "groq-sdk";
import { AppError } from "../../common/middleware/error-handler.middleware.js";
import { env } from "../../config/env.config.js";
import { AI_MODEL, AI_TOKEN_LIMITS } from "./ai.constant.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

//Types dasar nya 
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  messages: ChatMessage[];
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: 'groq' | 'gemini';
}

export interface ProviderStatus {
  groq: boolean;
  gemini: boolean;
  primary: 'groq' | 'gemini' | 'none';
}

let groqClient: Groq | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

export function initializeAIProviders(): ProviderStatus {
    const groqApiKey = env().GROQ_API_KEY;
    const geminiApiKey = env().GEMINI_API_KEY;

    if(groqApiKey) {
        groqClient = new Groq({apiKey: groqApiKey});
        console.log("Groq AI initialized");
    } else {
        console.warn("Groq API key not configured, Groq AI will be unavailable");
    }

    if(geminiApiKey) {
        geminiClient = new GoogleGenerativeAI(geminiApiKey);
        console.log("Gemini AI initialized");
    } else {
        console.warn("Gemini API key not configured, Gemini AI will be unavailable");
    }

    if(!groqClient && !geminiClient) {
        console.error("No AI providers configured! AI features will be unavailable");
    }

    const primary = groqApiKey ? 'groq' : geminiApiKey ? 'gemini' : 'none';

    return {
        groq: !!groqClient,
        gemini: !!geminiClient,
        primary,
    };
}

export function getProviderStatus(): ProviderStatus {
    return {
        groq: !!groqClient,
        gemini: !!geminiClient,
        primary: groqClient ? 'groq' : geminiClient ? 'gemini' : 'none',
    }
}

export function estimateToken(text: string): number {
    if(!text) return 0;
    return Math.ceil(text.length / 3.5);
}

export function estimateMessagesTokens(messages: ChatMessage[]): number {
    let total = 0;
    for(const msg of messages) {
        total += estimateToken(msg.content) + 4; 
    }
    return total;
}

async function generateWithGroq(options: GenerateOptions): Promise<GenerateResult> {
    if(!groqClient) throw new AppError(503, "Groq AI provider is not configured");

    const {
        messages,
        model = AI_MODEL.GROQ_LLAMA_70B,
        maxOutputTokens = AI_TOKEN_LIMITS.MAX_OUTPUT_TOKENS,
        temperature = 0.7,
    } = options;

    const input = estimateMessagesTokens(messages);

    if(input + maxOutputTokens > AI_TOKEN_LIMITS.MAX_INPUT_TOKENS) {
        throw new AppError(400, `Input messages are too long. Estimated tokens: ${input}. Max allowed (input + output): ${AI_TOKEN_LIMITS.MAX_INPUT_TOKENS}`);
    }

    try {
        const completion = await groqClient.chat.completions.create({
            model,
            messages: messages.map(m => ({
                role: m.role as 'system' | 'user' | 'assistant', 
                content: m.content,
            })),
            max_tokens: maxOutputTokens,
            temperature,
            top_p: 0.95,
        });

        const responseText = completion.choices[0]?.message?.content || '';
        const outputTokens = completion.usage?.completion_tokens || estimateToken(responseText);

        return {
            text: responseText,
            inputTokens: completion.usage?.prompt_tokens || input,
            outputTokens,
            model,
            provider: 'groq',
        };
    } catch (error) {
        const errorM = error instanceof Error ? error.message : 'Unknown error';
        throw new AppError(500, `Groq AI generation failed: ${errorM}`);
    }
}

async function generateWithGemini(options: GenerateOptions): Promise<GenerateResult> {

    if (!geminiClient) {
        throw new AppError(503, 'Gemini provider not initialized');
    }

    const {
        messages,
        model = AI_MODEL.GEMINI_FLASH,
        maxOutputTokens = AI_TOKEN_LIMITS.MAX_OUTPUT_TOKENS,
        temperature = 0.7,
    } = options;

    const inputTokens = estimateMessagesTokens(messages);
    
    if (inputTokens > AI_TOKEN_LIMITS.MAX_INPUT_TOKENS) {
        throw new AppError(400, `Input exceeds maximum token limit of ${AI_TOKEN_LIMITS.MAX_INPUT_TOKENS}. Estimated tokens: ${inputTokens}`);
    }

    try {
        const systemMessages = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        //Pusing bagian sini  jujur ya 
        const modelParams: { model: string; systemInstruction?: string } = { model };
        if (systemMessages?.content) {
            modelParams.systemInstruction = systemMessages.content;
        }

        const geminiModel = geminiClient.getGenerativeModel(modelParams);

        const contents = userMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' as const : 'user' as const,
            parts:  [{text: m.content}],
        }));

        const result = await geminiModel.generateContent({
            contents,
            generationConfig: {
                maxOutputTokens,
                temperature,
                topP: 0.95,
                topK: 40,
            },
        });

        const responseText = result.response.text();
        const outputTokens = estimateToken(responseText);

        return {
            text: responseText,
            inputTokens,
            outputTokens,
            model,
            provider: 'gemini',
        };
    } catch (error) {
        const errorM = error instanceof Error ? error.message : 'Unknown error';
        throw new AppError(500, `Gemini AI generation failed: ${errorM}`);
    }
}

export async function generateWithFallback(options: GenerateOptions): Promise<GenerateResult> {
    const errors: Array<{provider: string; error: string}> = [];

    if (groqClient) {
        try {
                console.log('Attempting generation with Groq...');
                const result = await generateWithGroq(options);
                console.log(`✅ Groq generation successful (${result.inputTokens} input, ${result.outputTokens} output tokens)`);
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                errors.push({ provider: 'groq', error: errorMessage });
                console.warn(`Groq failed: ${errorMessage}. Falling back to Gemini...`);
            }
    }

    if(geminiClient) {
        try {
            console.log("Fallback: Attempting generation with Gemini");
            const result = await generateWithGemini(options);
            console.log(`Gemini generation successful (${result.inputTokens} input, ${result.outputTokens} output tokens)`)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push({ provider: 'gemini', error: errorMessage });
            console.error(`❌ Gemini also failed: ${errorMessage}`);
        }
    }

    const errorDetail = errors.map(err => `${err.provider}: ${err.error}`).join('; ')
    throw new AppError(503, `All AI providers failed. ${errorDetail}`);
}

export async function generateWithProvider(
  provider: 'groq' | 'gemini',
  options: GenerateOptions
): Promise<GenerateResult> {
  if (provider === 'groq') {
    return generateWithGroq(options);
  }
  return generateWithGemini(options);
}