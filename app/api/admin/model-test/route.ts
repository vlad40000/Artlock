import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { GoogleGenAI } from '@google/genai';
import { env } from '@/lib/utils/env';
import { apiErrorResponse } from '@/lib/server/api-error';
import { TATTOO_PHASE_1A } from '@/lib/ai/prompt-contracts/tattoo-phase-1a';
import { TATTOO_PHASE_1B } from '@/lib/ai/prompt-contracts/tattoo-phase-1b';
import { TATTOO_PHASE_3 } from '@/lib/ai/prompt-contracts/tattoo-phase-3';
import { TATTOO_FLASH_THEME } from '@/lib/ai/prompt-contracts/tattoo-flash-theme';

const Modality = { TEXT: 'TEXT', IMAGE: 'IMAGE' } as any;

const bodySchema = z.object({
  phase: z.enum(['1A', '1B', '3', 'flash-theme']),
  modelOverride: z.string().min(3).max(80),
  imageBase64: z.string().min(1),
  mimeType: z.string().default('image/png'),
  // 1B inputs
  delta1: z.string().optional(),
  designIdLock: z.string().optional(),
  styleIdLock: z.string().optional(),
  // Phase 3 inputs
  aspectRatio: z.string().optional(),
  resolution: z.string().optional(),
  constraints: z.string().optional().nullable(),
});

function normalizeModel(raw: string) {
  const m = raw.trim().replace(/^models\//, '');
  return `models/${m}`;
}

// POST /api/admin/model-test
// Admin-only: run a prompt phase with a model override and return result + latency
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = bodySchema.parse(await req.json());
    const model = normalizeModel(body.modelOverride);
    const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

    const isImageGenPhase = body.phase === '1B' || body.phase === '3';

    let contents: any[];
    let config: any;

    if (body.phase === '1A') {
      contents = [{
        role: 'user',
        parts: [
          { text: TATTOO_PHASE_1A.userInstruction },
          { inlineData: { mimeType: body.mimeType, data: body.imageBase64 } },
        ],
      }];
      config = { systemInstruction: TATTOO_PHASE_1A.systemInstruction, temperature: 0.2 };

    } else if (body.phase === 'flash-theme') {
      contents = [{
        role: 'user',
        parts: [
          { text: TATTOO_FLASH_THEME.prompt },
          { inlineData: { mimeType: body.mimeType, data: body.imageBase64 } },
        ],
      }];
      config = { systemInstruction: TATTOO_FLASH_THEME.systemInstruction, temperature: 0.2 };

    } else if (body.phase === '1B') {
      const prompt = TATTOO_PHASE_1B.buildPrompt({
        designIdLock: body.designIdLock ?? '[X]',
        styleIdLock: body.styleIdLock ?? '[X]',
        contextIdLock: '[X]', cameraIdLock: '[X]', compositionIdLock: '[X]',
        tattooIdLock: '[X]', placementIdLock: '[X]',
        delta1: body.delta1 ?? 'Make no change — test pass',
        maskMode: 'none', references: [],
      });
      contents = [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: body.mimeType, data: body.imageBase64 } },
        ],
      }];
      config = {
        imageConfig: { imageSize: '2K' },
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 65536,
      };

    } else {
      // Phase 3 — variant sheet
      const prompt = TATTOO_PHASE_3.buildPrompt({
        designIdLock: body.designIdLock ?? '[X]',
        styleIdLock: body.styleIdLock ?? '[X]',
        aspectRatio: body.aspectRatio ?? '1:1',
        resolution: body.resolution ?? '1024x1024',
        constraints: body.constraints ?? null,
      });
      contents = [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: body.mimeType, data: body.imageBase64 } },
        ],
      }];
      config = {
        imageConfig: { imageSize: '2K' },
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        temperature: 0.3,
        topP: 0.95,
        maxOutputTokens: 65536,
      };
    }

    const startMs = Date.now();
    const response = await ai.models.generateContent({ model, contents, config }) as any;
    const latencyMs = Date.now() - startMs;

    // Extract text or image from response
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const textPart = parts.find((p: any) => p.text);
    const imagePart = parts.find((p: any) => p.inlineData);

    return NextResponse.json({
      status: 'succeeded',
      model,
      phase: body.phase,
      latencyMs,
      text: textPart?.text ?? null,
      imageBase64: imagePart?.inlineData?.data ?? null,
      imageMimeType: imagePart?.inlineData?.mimeType ?? null,
      usageMetadata: response.usageMetadata ?? null,
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'admin-model-test' });
  }
}
