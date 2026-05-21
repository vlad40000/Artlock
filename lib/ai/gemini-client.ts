import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '@/lib/utils/env';
import { TATTOO_PHASE_1A } from './prompt-contracts/tattoo-phase-1a';
import { TATTOO_PHASE_1B } from './prompt-contracts/tattoo-phase-1b';
import { TATTOO_PHASE_1C } from './prompt-contracts/tattoo-phase-1c';
import { TATTOO_PHASE_2C } from './prompt-contracts/tattoo-phase-2c';
import { TATTOO_PHASE_3 } from './prompt-contracts/tattoo-phase-3';
import { TATTOO_PHASE_4A } from './prompt-contracts/tattoo-phase-4a';
import { TATTOO_PHASE_5 } from './prompt-contracts/tattoo-phase-5';
import { TATTOO_QA, TattooQAReport } from './prompt-contracts/tattoo-qa';
import { downloadAsset } from '../utils/storage';
import { AI_OPTIMIZE, AI_OPTIMIZE_DEFAULT_INSTRUCTIONS } from './prompt-contracts/ai-optimize';
import { VOICE_COMMAND } from './prompt-contracts/voice-command';
import { TATTOO_FLASH_THEME } from './prompt-contracts/tattoo-flash-theme';
import { TATTOO_FLASH_GENERATE } from './prompt-contracts/tattoo-flash-generate';


const Modality = { TEXT: 'TEXT', IMAGE: 'IMAGE' } as any;

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_TIMEOUT_MS = 75_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { status?: unknown; code?: unknown; response?: { status?: unknown } };
  const rawStatus = candidate.status ?? candidate.code ?? candidate.response?.status;
  return typeof rawStatus === 'number' ? rawStatus : null;
}

function isRetriableGeminiError(error: unknown) {
  const status = getErrorStatus(error);
  if (status && [500, 502, 503, 504].includes(status)) return true;

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return [
    'fetch failed',
    'network',
    'econnreset',
    'etimedout',
    'socket hang up',
    'timeout',
    'temporarily unavailable',
  ].some((needle) => message.includes(needle));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function generateContentWithRetry(request: Parameters<typeof ai.models.generateContent>[0], label: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await withTimeout(ai.models.generateContent(request), GEMINI_TIMEOUT_MS, label);
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < GEMINI_MAX_ATTEMPTS && isRetriableGeminiError(error);

      if (!shouldRetry) {
        throw error;
      }

      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

export async function collectGenerateContentStream(
  request: Parameters<typeof ai.models.generateContent>[0],
): Promise<any> {
  const stream = await ai.models.generateContentStream(request as any);
  const parts: any[] = [];
  let text = '';

  for await (const chunk of stream as any) {
    const chunkParts = chunk.candidates?.[0]?.content?.parts ?? [];
    parts.push(...chunkParts);
    if (chunk.text) {
      text += chunk.text;
    }
  }

  return {
    text: text.trim(),
    candidates: [{ content: { parts } }],
  };
}

export async function generateImageContentWithRetry(
  request: Parameters<typeof ai.models.generateContent>[0],
  label: string,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await withTimeout(collectGenerateContentStream(request), GEMINI_TIMEOUT_MS, label);
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < GEMINI_MAX_ATTEMPTS && isRetriableGeminiError(error);

      if (!shouldRetry) {
        throw error;
      }

      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

export function buildImageConfig(args: {
  temperature: number;
  systemInstruction?: string;
  thinkingLevel?: 'minimal' | 'high';
}) {
  return {
    ...(args.systemInstruction ? { systemInstruction: args.systemInstruction } : {}),
    imageConfig: {
      imageSize: '2K',
    },
    responseModalities: [Modality.IMAGE, Modality.TEXT],
    temperature: args.temperature,
    topP: 0.95,
    maxOutputTokens: 65536,
    ...(args.thinkingLevel ? { 
      thinkingConfig: { 
        includeThoughts: true, 
        thinkingLevel: args.thinkingLevel 
      } 
    } : {}),
  } as any;
}

export function extractJsonBlock(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return text.trim();
}

/**
 * Extracts balanced JSON from a string, supporting nested structures.
 */
export function extractFirstBalancedObject(text: string): string {
  const startIndex = text.indexOf('{');
  if (startIndex === -1) return text;

  let depth = 0;
  const open = '{';
  const close = '}';

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (char === open) depth += 1;

    if (char === close) {
      depth -= 1;

      if (depth === 0) {
        return text.slice(startIndex, i + 1).trim();
      }
    }
  }

  return text.slice(startIndex).trim();
}

export async function buildVisionParts(args: {
  text: string;
  imageUrls?: string[];
}) {
  const parts: Array<Record<string, unknown>> = [{ text: args.text }];
  const uniqueImageUrls = Array.from(new Set((args.imageUrls ?? []).filter(Boolean)));

  if (uniqueImageUrls.length === 0) {
    return parts;
  }

  const images = await Promise.all(uniqueImageUrls.map((url) => downloadAsset(url)));
  for (const image of images) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64,
      },
    });
  }

  return parts;
}

export async function generateStructuredText<TSchema extends z.ZodTypeAny>(args: {
  systemInstruction: string;
  userInstruction: string;
  schema: TSchema;
  imageUrls?: string[];
  temperature?: number;
}): Promise<z.infer<TSchema>> {
  const parts = await buildVisionParts({
    text: args.userInstruction,
    imageUrls: args.imageUrls,
  });

  const response = (await generateContentWithRetry({
    model: env.geminiTextModel,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: args.systemInstruction,
      temperature: args.temperature ?? 0.2,
    },
  }, 'gemini-structured-text')) as any;

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Gemini returned no structured text');
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(extractJsonBlock(text));
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Gemini returned invalid JSON: ${error.message}`
        : 'Gemini returned invalid JSON',
    );
  }

  const parsed = args.schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(`Gemini returned unexpected JSON shape: ${parsed.error.issues[0]?.message ?? 'unknown error'}`);
  }

  return parsed.data;
}

export async function generatePlainText(args: {
  systemInstruction: string;
  userInstruction: string;
  imageUrls?: string[];
  temperature?: number;
}) {
  const parts = await buildVisionParts({
    text: args.userInstruction,
    imageUrls: args.imageUrls,
  });

  const response = (await generateContentWithRetry({
    model: env.geminiTextModel,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: args.systemInstruction,
      temperature: args.temperature ?? 0.2,
    },
  }, 'gemini-plain-text')) as any;

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Gemini returned no plain text');
  }

  return text;
}

export function extractFirstImage(response: any): { base64: string; mimeType: string } {
  const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData);
  if (!imagePart) {
    throw new Error('Gemini returned no image content');
  }
  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}

