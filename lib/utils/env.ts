const required = [
  'DATABASE_URL',
  'GEMINI_API_KEY',
  'BLOB_READ_WRITE_TOKEN',
  'ADMIN_EMAILS',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] Missing ${key}`);
  }
}

const GEMINI_TEXT_FALLBACK = 'gemini-3.1-pro-preview';
const GEMINI_IMAGE_FALLBACK = 'gemini-3.1-flash-image-preview';
const DEPRECATED_GEMINI_TEXT_MODEL = 'gemini-3-pro-preview';

function normalizeGeminiModelName(
  value: string | undefined,
  fallback: string,
  kind: 'text' | 'image',
) {
  const raw = (value ?? fallback).trim();
  let model = raw
    .replace(/^models\//, '')
    .replace(/^publishers\/google\/models\//, '')
    .replace(/^.*\/models\//, '');

  if (!model) return `models/${fallback}`; // Ensure fallback is prefixed

  if (model === DEPRECATED_GEMINI_TEXT_MODEL) {
    model = kind === 'image' ? GEMINI_IMAGE_FALLBACK : GEMINI_TEXT_FALLBACK;
  }

  if (kind === 'image' && model === GEMINI_TEXT_FALLBACK) {
    model = GEMINI_IMAGE_FALLBACK;
  }

  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(model)) {
    throw new Error(
      `[env] Invalid Gemini ${kind} model name: ${raw}. Use a model code like ${fallback}, not a URL or display label.`,
    );
  }

  // FIX: Prepend the required API prefix before returning the model string
  return `models/${model}`; 
}

export const env = {
  geminiApiKey: process.env.GEMINI_API_KEY!,
  geminiTextModel: normalizeGeminiModelName(process.env.GEMINI_TEXT_MODEL, GEMINI_TEXT_FALLBACK, 'text'),
  geminiPhase1AModel: normalizeGeminiModelName(process.env.GEMINI_PHASE_1A_MODEL, GEMINI_TEXT_FALLBACK, 'text'),
  geminiImageModel: normalizeGeminiModelName(
    process.env.GEMINI_IMAGE_MODEL,
    GEMINI_IMAGE_FALLBACK,
    'image',
  ),
  databaseUrl: process.env.DATABASE_URL!,
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN!,
  adminEmails: process.env.ADMIN_EMAILS ?? '',
};
