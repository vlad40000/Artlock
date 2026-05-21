/**
 * gemini.ts — barrel re-export
 *
 * Split into domain modules:
 *   gemini-client.ts  — shared infrastructure (AI client, retry, helpers)
 *   gemini-text.ts    — lock extraction, prompt optimise, voice, QA
 *   gemini-image.ts   — surgical, creative, turnaround, variant, stencil, mockup
 *   gemini-flash.ts   — flash theme extraction and design generation
 *
 * All callers continue to import from '@/lib/ai/gemini'.
 */

export { generateContentWithRetry, extractFirstBalancedObject } from './gemini-client';
export type { } from './gemini-client';

export {
  extractTattooLocks,
  optimizePromptText,
  runTattooQA,
  parseVoiceCommand,
} from './gemini-text';
export type { ParsedVoiceCommand } from './gemini-text';

export {
  runTattooSurgicalEdit,
  runTattooCreativeDelta,
  runTattooTurnaround,
  runTattooVariantSheet,
  runTattooStencil,
  runTattooMockup,
} from './gemini-image';
export type { ReferenceAssetInput } from './gemini-image';

export {
  extractFlashTheme,
  generateFlashDesign,
} from './gemini-flash';
export type { FlashThemeExtraction } from './gemini-flash';
