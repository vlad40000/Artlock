import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getOwnedSessionDetail } from '@/lib/server/session-detail';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const bodySchema = z.object({
  editRunId: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = paramsSchema.parse(await context.params);
    const body = bodySchema.parse(await request.json());
    const detailResult = await getOwnedSessionDetail(sessionId);

    if (!detailResult.ok) {
      return NextResponse.json({ error: detailResult.error }, { status: detailResult.status });
    }

    const targetRun = detailResult.detail.editRuns.find((run) => run.id === body.editRunId);
    if (!targetRun) {
      return NextResponse.json({ error: 'Edit run not found' }, { status: 404 });
    }

    await sql`
      UPDATE design_sessions
      SET latest_approved_asset_id = ${targetRun.output_asset_id}
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        latestApprovedAssetId: targetRun.output_asset_id,
        approvedEditRunId: targetRun.id,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'approve-edit' });
  }
}
