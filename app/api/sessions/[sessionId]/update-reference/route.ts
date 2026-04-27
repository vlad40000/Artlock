import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { getOwnedSessionDetail } from '@/lib/server/session-detail';
import { sql } from '@/lib/db';

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

    // Verify asset exists and belongs to the project
    const assets = await sql`
      SELECT id FROM assets WHERE id = ${assetId} AND project_id = ${detail.project.id}
    ` as any[];

    if (assets.length === 0) {
      return NextResponse.json({ error: 'Asset not found or not part of this project' }, { status: 404 });
    }

    // Update only the selected reference. The current base remains intact so board-driven
    // reference transfer does not reset the active edit lineage.
    await sql`
      UPDATE design_sessions
      SET reference_asset_id = ${assetId}
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        referenceAssetId: assetId,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'update-reference' });
  }
}
