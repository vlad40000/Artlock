// Flash-specific AI operations: theme extraction and design generation
import { env } from '@/lib/utils/env';
import { TATTOO_FLASH_THEME } from './prompt-contracts/tattoo-flash-theme';
import { TATTOO_FLASH_GENERATE } from './prompt-contracts/tattoo-flash-generate';
import { generateContentWithRetry, generateImageContentWithRetry, buildImageConfig, extractFirstImage } from './gemini-client';

export interface FlashThemeExtraction {
  suggested_title: string;
  style_family: string;
  palette_lock: string;
  motif_lock: string;
  line_weight_lock: string;
  shading_lock: string;
  composition_rules: string;
  raw_theme_lock: string;
}

export async function extractFlashTheme(args: {
  imageBase64: string;
  mimeType: string;
}): Promise<FlashThemeExtraction> {
  const response = (await generateContentWithRetry({
    model: env.geminiPhase1AModel,
    contents: [{
      role: 'user',
      parts: [
        { text: TATTOO_FLASH_THEME.prompt },
        { inlineData: { mimeType: args.mimeType, data: args.imageBase64 } },
      ],
    }],
    config: { systemInstruction: TATTOO_FLASH_THEME.systemInstruction, temperature: 0.2 },
  }, 'flash-theme-extraction')) as any;

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned no theme text');

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('Gemini returned invalid JSON for flash theme');
  }

  if (parsed.error) throw new Error(parsed.error);

  return {
    suggested_title:   parsed.suggested_title   ?? 'Untitled Theme',
    style_family:      parsed.style_family      ?? '[X]',
    palette_lock:      parsed.palette_lock      ?? '[X]',
    motif_lock:        parsed.motif_lock        ?? '[X]',
    line_weight_lock:  parsed.line_weight_lock  ?? '[X]',
    shading_lock:      parsed.shading_lock      ?? '[X]',
    composition_rules: parsed.composition_rules ?? '[X]',
    raw_theme_lock:    parsed.raw_theme_lock    ?? '[X]',
  };
}

export async function generateFlashDesign(args: {
  subjectRequest: string;
  rawThemeLock: string;
  paletteLock: string;
  lineWeightLock: string;
  shadingLock: string;
  compositionRules: string;
  motifLock: string;
  styleFamilyLock: string;
  temperature?: number;
}): Promise<{ base64: string; mimeType: string }> {
  const response = await generateImageContentWithRetry({
    model: env.geminiImageModel,
    contents: [{ role: 'user', parts: [{ text: TATTOO_FLASH_GENERATE.buildPrompt(args) }] }],
    config: buildImageConfig({ temperature: args.temperature ?? 0.4 }),
  }, 'flash-design-generation');
  return extractFirstImage(response);
}
