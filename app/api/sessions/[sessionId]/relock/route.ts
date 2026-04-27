import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { getOwnedSessionDetail, resolveSessionAsset } from '@/lib/server/session-detail';
import { createLockFromAsset } from '@/lib/server/lock';
import { TATTOO_PHASE_1A } from '@/lib/ai/prompt-contracts/tattoo-phase-1a';
import { env } from '@/lib/utils/env';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const bodySchema = z.object({
  sourceAssetId: z.string().uuid().optional().nullable(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = paramsSchema.parse(await context.params);
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const detailResult = await getOwnedSessionDetail(sessionId);

    if (!detailResult.ok) {
      return NextResponse.json({ error: detailResult.error }, { status: detailResult.status });
    }

    const detail = detailResult.detail;
    if (!detail.currentBaseAsset) {
      return NextResponse.json({ error: 'Base v1 is required before re-lock. Approve an edit first.' }, { status: 400 });
    }

    const sourceAsset = body.sourceAssetId
      ? resolveSessionAsset(detail, body.sourceAssetId)
      : detail.currentBaseAsset;

    if (!sourceAsset || sourceAsset.id !== detail.currentBaseAsset.id) {
      return NextResponse.json({ error: 'Re-lock only supports the approved Base v1 asset.' }, { status: 400 });
    }

    const created = await createLockFromAsset({ sessionId, sourceAsset });

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        lockId: created.lockId,
        version: created.version,
        sourceAssetId: sourceAsset.id,
      },
      inputs: {
        sourceAssetId: sourceAsset.id,
        operation: 'relock',
      },
      prompt_contract: {
        name: TATTOO_PHASE_1A.name,
        version: TATTOO_PHASE_1A.version,
        model: env.geminiPhase1AModel,
      },
      detail: created.parsed,
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'relock' });
  }
}
