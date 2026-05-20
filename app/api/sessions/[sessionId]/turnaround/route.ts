import { NextRequest, NextResponse } from 'next/server';
import { runTattooTurnaround } from '@/lib/ai/gemini';
import { getOwnedSessionDetail, resolveSessionAsset } from '@/lib/server/session-detail';
import { createEditRun } from '@/lib/server/edit-run';
import { downloadAsset } from '@/lib/utils/storage';
import { put } from '@vercel/blob';
import { apiErrorResponse } from '@/lib/server/api-error';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await req.json();
    const { baseAssetId, views, layout } = body;

    const result = await getOwnedSessionDetail(sessionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { detail } = result;

    const baseAsset = resolveSessionAsset(detail, baseAssetId)
      ?? detail.latestApprovedAsset
      ?? detail.currentBaseAsset;
    if (!baseAsset) {
      return NextResponse.json({ error: 'Base asset not found' }, { status: 400 });
    }

    const { base64, mimeType } = await downloadAsset(baseAsset.blob_url);
    const resolvedViews: string[] = views?.length ? views : ['Front', 'Side', 'Back'];
    const resolvedLayout: 'single' | 'separate' = layout === 'separate' ? 'separate' : 'single';

    const turnaroundResult = await runTattooTurnaround({
      baseImageBase64: base64,
      mimeType,
      views: resolvedViews,
      layout: resolvedLayout,
      designIdLock: detail.activeLock?.design_id_lock,
      styleIdLock: detail.activeLock?.style_id_lock,
    });

    const buffer = Buffer.from(turnaroundResult.base64, 'base64');
    const blob = await put(
      `sessions/${sessionId}/turnaround-${Date.now()}.png`,
      buffer,
      { contentType: turnaroundResult.mimeType, access: 'public' },
    );

    const run = await createEditRun({
      sessionId,
      operation: 'Turnaround',
      request: `Views: ${resolvedViews.join(', ')}`,
      inputAssetId: baseAsset.id,
      outputUrl: blob.url,
      metadata: { phase: '2c', views: resolvedViews, layout: resolvedLayout },
    });

    return NextResponse.json({
      status: 'succeeded',
      artifacts: {
        outputAsset: {
          id: run.output_asset_id,
          blob_url: blob.url,
        },
      },
      inputs: { baseAssetId: baseAsset.id, views: resolvedViews, layout: resolvedLayout },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'turnaround' });
  }
}
