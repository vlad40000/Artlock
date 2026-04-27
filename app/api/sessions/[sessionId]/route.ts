import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOwnedSessionDetail } from '@/lib/server/session-detail';

const paramsSchema = z.object({ sessionId: z.string().uuid() });

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = paramsSchema.parse(await context.params);
  const result = await getOwnedSessionDetail(sessionId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ status: 'succeeded', detail: result.detail });
}
