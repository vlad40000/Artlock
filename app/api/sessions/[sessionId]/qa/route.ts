import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { runTattooQA } from '@/lib/ai/gemini';
import { downloadAssetAsBase64 } from '@/lib/utils/storage';
import { getOwnedSessionDetail, resolveSessionAsset } from '@/lib/server/session-detail';
import { sql } from '@/lib/db';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const bodySchema = z.object({
  candidateAssetId: z.string().uuid(),
  operationChecked: z.string().optional(),
  allowedDelta: z.string().optional(),
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

    const detail = detailResult.detail;
    const lock = detail.activeLock;

    if (!lock) {
      return NextResponse.json({ 
        error: 'No active lock found for this session. Drift check requires a baseline lockset.' 
      }, { status: 400 });
    }

    // Resolve the candidate asset
    let candidateAsset = resolveSessionAsset(detail, body.candidateAssetId);
    if (!candidateAsset) {
       // Try direct DB lookup if not in session cache
       const assets = await sql`
        SELECT blob_url, mime_type
        FROM assets
        WHERE id = ${body.candidateAssetId} AND project_id = ${detail.project.id}
      `;
      if (!assets[0]) {
        return NextResponse.json({ error: 'Candidate asset not found' }, { status: 404 });
      }
      candidateAsset = assets[0] as any;
    }

    if (!candidateAsset) {
      return NextResponse.json({ error: 'Candidate asset resolution failed' }, { status: 404 });
    }

    const locksText = [
      `DESIGN ID (lock):\n${lock.design_id_lock}`,
      `STYLE ID (lock):\n${lock.style_id_lock}`,
      `CONTEXT ID (lock):\n${lock.context_id_lock}`,
      `CAMERA ID (lock):\n${lock.camera_id_lock}`,
      `COMPOSITION ID (lock):\n${lock.composition_id_lock}`,
      `TATTOO ID (lock):\n${lock.tattoo_id_lock}`,
      `PLACEMENT ID (lock):\n${lock.placement_id_lock}`,
    ].join('\n\n---\n\n');

    const image = await downloadAssetAsBase64(candidateAsset.blob_url);
    const report = await runTattooQA({
      candidateImageBase64: image.base64,
      mimeType: candidateAsset.mime_type || image.mimeType,
      locks: locksText,
      allowedDelta: body.allowedDelta,
    });

    return NextResponse.json({
      status: 'succeeded',
      report,
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'qa-drift-check' });
  }
}
