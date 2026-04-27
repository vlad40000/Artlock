import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { parseVoiceCommand } from '@/lib/ai/gemini';

const bodySchema = z.object({
  transcript: z.string().optional(),
  audioBase64: z.string().optional(),
  mimeType: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    
    if (!body.transcript && !body.audioBase64) {
      return NextResponse.json(
        { error: 'Either transcript or audioBase64 is required' },
        { status: 400 }
      );
    }

    const commands = await parseVoiceCommand({
      transcript: body.transcript,
      audioBase64: body.audioBase64,
      mimeType: body.mimeType,
    });

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        commands,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'voice-command' });
  }
}
