import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { TATTOO_PHASE_1A } from '@/lib/ai/prompt-contracts/tattoo-phase-1a';
import { env } from '@/lib/utils/env';
import { getOwnedSessionDetail, resolveSessionAsset } from '@/lib/server/session-detail';
import { createLockFromAsset } from '@/lib/server/lock';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const bodySchema = z.object({
  sourceAssetId: z.string().uuid().optional().nullable(),
  mode: z.enum(['initial', 'relock']).optional().default('initial'),
  tattooMode: z.boolean().optional(),
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
    const sourceAsset = body.sourceAssetId
      ? resolveSessionAsset(detail, body.sourceAssetId)
      : body.mode === 'relock'
        ? detail.latestApprovedAsset ?? detail.referenceAsset
        : detail.referenceAsset;

    if (!sourceAsset) {
      return NextResponse.json({ error: 'Source asset not found for lock extraction' }, { status: 404 });
    }

    const created = await createLockFromAsset({
      sessionId,
      sourceAsset,
      tattooMode: body.tattooMode,
    });

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        lockId: created.lockId,
        version: created.version,
        sourceAssetId: sourceAsset.id,
      },
      prompt_contract: {
        name: TATTOO_PHASE_1A.name,
        version: TATTOO_PHASE_1A.version,
        model: env.geminiPhase1AModel,
      },
      inputs: {
        sourceAssetId: sourceAsset.id,
        mode: body.mode,
      },
      detail: created.parsed,
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'extract-locks' });
  }
}
