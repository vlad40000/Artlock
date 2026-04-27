import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { optimizePromptText } from '@/lib/ai/gemini';
import { AI_OPTIMIZE_DEFAULT_INSTRUCTIONS } from '@/lib/ai/prompt-contracts/ai-optimize';

const fieldKinds = Object.keys(AI_OPTIMIZE_DEFAULT_INSTRUCTIONS) as [
  keyof typeof AI_OPTIMIZE_DEFAULT_INSTRUCTIONS,
  ...(keyof typeof AI_OPTIMIZE_DEFAULT_INSTRUCTIONS)[],
];

const bodySchema = z.object({
  originalText: z.string().min(1),
  instruction: z.string().optional().nullable(),
  fieldKind: z.enum(fieldKinds).optional().default('general'),
  imageUrls: z.array(z.string().url()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const optimizedText = await optimizePromptText({
      originalText: body.originalText,
      instruction: body.instruction,
      fieldKind: body.fieldKind,
      imageUrls: body.imageUrls,
    });

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        optimizedText,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'optimize-text' });
  }
}

