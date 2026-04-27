import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getOwnedSessionDetail } from '@/lib/server/session-detail';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const bodySchema = z.object({
  assetId: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = paramsSchema.parse(await context.params);
    const { assetId } = bodySchema.parse(await request.json());
    const detailResult = await getOwnedSessionDetail(sessionId);

    if (!detailResult.ok) {
      return NextResponse.json({ error: detailResult.error }, { status: detailResult.status });
    }

    const detail = detailResult.detail;
    const assets = await sql`
      SELECT id
      FROM assets
      WHERE id = ${assetId} AND project_id = ${detail.project.id}
      LIMIT 1
    ` as any[];

    if (!assets[0]) {
      return NextResponse.json({ error: 'Asset not found or not part of this project' }, { status: 404 });
    }

    const lockRows = await sql`
      SELECT id
      FROM locks
      WHERE session_id = ${sessionId} AND source_asset_id = ${assetId}
      ORDER BY version DESC
      LIMIT 1
    ` as any[];

    const lockId = lockRows[0]?.id ?? null;

    if (lockId) {
      await sql`
        UPDATE locks
        SET is_active = false
        WHERE session_id = ${sessionId} AND is_active = true
      `;

      await sql`
        UPDATE locks
        SET is_active = true
        WHERE id = ${lockId}
      `;
    }

    await sql`
      UPDATE design_sessions
      SET latest_approved_asset_id = ${assetId},
          active_lock_id = COALESCE(${lockId}, active_lock_id)
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        currentBaseAssetId: assetId,
        activeLockId: lockId,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'make-base' });
  }
}
