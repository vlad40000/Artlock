import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { apiErrorResponse } from '@/lib/server/api-error';
import { getOwnedSessionDetail } from '@/lib/server/session-detail';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const clientStateSchema = z.object({}).passthrough();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = paramsSchema.parse(await context.params);
    const detailResult = await getOwnedSessionDetail(sessionId);

    if (!detailResult.ok) {
      return NextResponse.json({ error: detailResult.error }, { status: detailResult.status });
    }

    const clientState = clientStateSchema.parse(await request.json());

    await sql`
      UPDATE design_sessions
      SET client_state = ${JSON.stringify(clientState)}::jsonb
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({ status: 'succeeded' });
  } catch (error) {
    return apiErrorResponse(error, { route: 'sync-session-client-state' });
  }
}
