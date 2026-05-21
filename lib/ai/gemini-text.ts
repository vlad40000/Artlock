// Text-model operations: lock extraction, prompt optimisation, voice, QA
import { env } from '@/lib/utils/env';
import { TATTOO_PHASE_1A } from './prompt-contracts/tattoo-phase-1a';
import { TATTOO_QA, TattooQAReport } from './prompt-contracts/tattoo-qa';
import { AI_OPTIMIZE, AI_OPTIMIZE_DEFAULT_INSTRUCTIONS } from './prompt-contracts/ai-optimize';
import { VOICE_COMMAND } from './prompt-contracts/voice-command';
import { z } from 'zod';
import {
  generateContentWithRetry,
  generateStructuredText,
  generatePlainText,
  buildVisionParts,
  extractJsonBlock,
} from './gemini-client';

// ── Lock extraction ───────────────────────────────────────────────────────────

export async function extractTattooLocks(args: {
  imageBase64: string;
  mimeType: string;
  tattooMode?: boolean;
}) {
  const response = (await generateContentWithRetry({
    model: env.geminiPhase1AModel,
    contents: [{
      role: 'user',
      parts: [
        { text: TATTOO_PHASE_1A.userInstruction },
        { inlineData: { mimeType: args.mimeType, data: args.imageBase64 } },
      ],
    }],
    config: { systemInstruction: TATTOO_PHASE_1A.systemInstruction, temperature: 0.2 },
  }, 'gemini-lock-extraction')) as any;

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned no lock text');
  return text;
}

// ── Prompt optimisation ───────────────────────────────────────────────────────

export async function optimizePromptText(args: {
  originalText: string;
  instruction?: string | null;
  fieldKind?: keyof typeof AI_OPTIMIZE_DEFAULT_INSTRUCTIONS;
  imageUrls?: string[];
  locks?: string | null;
}) {
  const baseInstructions = AI_OPTIMIZE_DEFAULT_INSTRUCTIONS[args.fieldKind ?? 'general'];
  const fullInstructions = args.instruction
    ? `${baseInstructions}\n\nAdditional instructions: ${args.instruction}`
    : baseInstructions;

  return generatePlainText({
    systemInstruction: fullInstructions,
    userInstruction: AI_OPTIMIZE.buildPrompt({
      originalText: args.originalText,
      instruction: args.instruction || 'Refine for clarity and intent.',
      fieldKind: args.fieldKind || 'general',
      locks: args.locks,
    }),
    imageUrls: args.imageUrls,
  });
}

// ── QA / Drift check ─────────────────────────────────────────────────────────

export async function runTattooQA(args: {
  candidateImageBase64: string;
  mimeType: string;
  locks: string;
  allowedDelta?: string;
}): Promise<TattooQAReport> {
  const parts = [
    { text: TATTOO_QA.userInstruction(args.locks, args.allowedDelta) },
    { inlineData: { mimeType: args.mimeType, data: args.candidateImageBase64 } },
  ];

  const response = (await generateContentWithRetry({
    model: env.geminiTextModel,
    contents: [{ role: 'user', parts }],
    config: { systemInstruction: TATTOO_QA.systemInstruction, temperature: 0.1 },
  }, 'tattoo-qa-drift-check')) as any;

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned no QA report');

  try {
    return TATTOO_QA.schema.parse(JSON.parse(extractJsonBlock(text)));
  } catch (error) {
    console.error('QA Parsing Error:', error, text);
    throw new Error('Failed to parse QA report from Gemini');
  }
}

// ── Voice command parsing ─────────────────────────────────────────────────────

const voiceSchema = z.object({
  operation: z.enum(['Extract', 'Surgical', 'Creative', 'Variant', 'Turnaround', 'Stencil', 'Mockup', 'QA', 'unknown']),
  request: z.string(),
  confidence: z.number(),
  reasoning: z.string().optional(),
});
export type ParsedVoiceCommand = z.infer<typeof voiceSchema>;

export async function parseVoiceCommand(args: {
  transcript?: string;
  currentOperation?: string;
}): Promise<ParsedVoiceCommand> {
  const transcript = args.transcript?.trim();
  if (!transcript) throw new Error('Transcript is required for voice command parsing');
  const response = (await generateContentWithRetry({
    model: env.geminiTextModel,
    contents: [{
      role: 'user',
      parts: [{ text: VOICE_COMMAND.buildPrompt(transcript) }],
    }],
    config: { systemInstruction: VOICE_COMMAND.systemInstruction, temperature: 0.1 },
  }, 'voice-command-parsing')) as any;

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned no voice command text');

  try {
    const parsed = voiceSchema.parse(JSON.parse(extractJsonBlock(text)));
    return parsed;
  } catch {
    throw new Error('Failed to parse voice command from Gemini');
  }
}
