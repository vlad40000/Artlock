// Image-model operations: surgical edit, creative delta, turnaround, variant sheet, stencil, mockup
import { env } from '@/lib/utils/env';
import { TATTOO_PHASE_1B } from './prompt-contracts/tattoo-phase-1b';
import { TATTOO_PHASE_1C } from './prompt-contracts/tattoo-phase-1c';
import { TATTOO_PHASE_2C } from './prompt-contracts/tattoo-phase-2c';
import { TATTOO_PHASE_3 } from './prompt-contracts/tattoo-phase-3';
import { TATTOO_PHASE_4A } from './prompt-contracts/tattoo-phase-4a';
import { TATTOO_PHASE_5 } from './prompt-contracts/tattoo-phase-5';
import {
  generateImageContentWithRetry,
  buildImageConfig,
  extractFirstImage,
} from './gemini-client';

export interface ReferenceAssetInput {
  base64: string;
  mimeType: string;
  designIdLock?: string | null;
  styleIdLock?: string | null;
}

export async function runTattooSurgicalEdit(args: {
  baseImageBase64: string; maskImageBase64: string | null; maskMimeType?: string | null;
  referenceImages?: ReferenceAssetInput[]; mimeType: string;
  designIdLock: string; styleIdLock: string; tattooIdLock?: string | null;
  placementIdLock?: string | null;
  delta1: string; delta2?: string | null; poseDelta?: string | null; regionHint?: string | null;
  symmetryLock?: boolean; tattooMode?: boolean; maskType?: 'include' | 'exclude'; temperature?: number;
}) {
  const prompt = TATTOO_PHASE_1B.buildPrompt({
    ...args, maskMode: args.maskImageBase64 ? 'provided' : 'none', references: args.referenceImages ?? [],
  });
  const userParts: any[] = [
    { text: prompt },
    { inlineData: { mimeType: args.mimeType, data: args.baseImageBase64 } },
  ];
  if (args.maskImageBase64) userParts.push({ inlineData: { mimeType: args.maskMimeType || args.mimeType, data: args.maskImageBase64 } });
  for (const ref of args.referenceImages ?? []) userParts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } });

  const response = await generateImageContentWithRetry({
    model: env.geminiImageModel,
    contents: [{ role: 'user', parts: userParts }],
    config: buildImageConfig({ temperature: args.temperature ?? 1.0, thinkingLevel: 'high' }),
  }, 'tattoo-surgical-edit');
  return extractFirstImage(response);
}

export async function runTattooCreativeDelta(args: {
  baseImageBase64: string; maskImageBase64?: string | null; maskMimeType?: string | null;
  maskType?: 'include' | 'exclude'; referenceImages?: ReferenceAssetInput[]; mimeType: string;
  designIdLock: string; styleIdLock: string; tattooIdLock?: string | null;
  placementIdLock?: string | null;
  transformation: string; intensity: 'low' | 'medium' | 'high';
  exclusions?: string | null; transferInstruction?: string | null;
  transferMode?: 'none' | 'reference_transfer' | 'locked_reference_transfer';
  symmetryLock?: boolean; tattooMode?: boolean; temperature?: number;
}) {
  const prompt = TATTOO_PHASE_1C.buildPrompt({
    ...args, maskMode: args.maskImageBase64 ? 'provided' : 'none', references: args.referenceImages ?? [],
  });
  const parts: any[] = [
    { text: prompt },
    { inlineData: { mimeType: args.mimeType, data: args.baseImageBase64 } },
  ];
  if (args.maskImageBase64) parts.push({ inlineData: { mimeType: args.maskMimeType || args.mimeType, data: args.maskImageBase64 } });
  for (const ref of args.referenceImages ?? []) parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } });

  const response = await generateImageContentWithRetry({
    model: env.geminiImageModel,
    contents: [{ role: 'user', parts }],
    config: buildImageConfig({ temperature: args.temperature ?? 1.0, thinkingLevel: args.intensity === 'low' ? 'minimal' : 'high' }),
  }, 'tattoo-creative-delta');
  return extractFirstImage(response);
}

export async function runTattooTurnaround(args: {
  baseImageBase64: string; mimeType: string; views: string[];
  layout: 'single' | 'separate'; designIdLock?: string | null;
  styleIdLock?: string | null; temperature?: number;
}) {
  const prompt = TATTOO_PHASE_2C.buildPrompt({
    views: args.views, layout: args.layout,
    designIdLock: args.designIdLock ?? undefined,
    styleIdLock: args.styleIdLock ?? undefined,
  });
  const response = await generateImageContentWithRetry({
    model: env.geminiImageModel,
    contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: args.mimeType, data: args.baseImageBase64 } }] }],
    config: buildImageConfig({ temperature: args.temperature ?? 0.2 }),
  }, 'tattoo-turnaround');
  return extractFirstImage(response);
}

export async function runTattooVariantSheet(args: {
  baseImageBase64: string; mimeType: string; designIdLock: string; styleIdLock: string;
  aspectRatio: string; resolution: string; constraints?: string | null; temperature?: number;
}) {
  const response = await generateImageContentWithRetry({
    model: env.geminiImageModel,
    contents: [{ role: 'user', parts: [{ text: TATTOO_PHASE_3.buildPrompt(args) }, { inlineData: { mimeType: args.mimeType, data: args.baseImageBase64 } }] }],
    config: buildImageConfig({ temperature: args.temperature ?? 0.3 }),
  }, 'tattoo-variant-sheet');
  return extractFirstImage(response);
}

export async function runTattooStencil(args: {
  baseImageBase64: string; mimeType: string; designIdLock: string; temperature?: number;
}) {
  const response = await generateImageContentWithRetry({
    model: env.geminiImageModel,
    contents: [{ role: 'user', parts: [{ text: TATTOO_PHASE_4A.buildPrompt(args) }, { inlineData: { mimeType: args.mimeType, data: args.baseImageBase64 } }] }],
    config: buildImageConfig({ temperature: args.temperature ?? 0.1 }),
  }, 'tattoo-stencil');
  return extractFirstImage(response);
}

export async function runTattooMockup(args: {
  baseImageBase64: string; mimeType: string; placement: string;
  tattooMode?: boolean; temperature?: number;
}) {
  const response = await generateImageContentWithRetry({
    model: env.geminiImageModel,
    contents: [{ role: 'user', parts: [{ text: TATTOO_PHASE_5.buildPrompt(args) }, { inlineData: { mimeType: args.mimeType, data: args.baseImageBase64 } }] }],
    config: buildImageConfig({ temperature: args.temperature ?? 0.4 }),
  }, 'tattoo-mockup');
  return extractFirstImage(response);
}
