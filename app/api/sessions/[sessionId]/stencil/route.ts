import { NextRequest, NextResponse } from 'next/server';
import { runTattooStencil } from '@/lib/ai/gemini';
import { getOwnedSessionDetail, resolveSessionAsset } from '@/lib/server/session-detail';
import { createEditRun } from '@/lib/server/edit-run';
import { downloadAsset } from '@/lib/utils/storage';
import { put } from '@vercel/blob';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await req.json();
    const { baseAssetId } = body;

    const result = await getOwnedSessionDetail(sessionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const detail = result.detail;

    const baseAsset = resolveSessionAsset(detail, baseAssetId) || detail.latestApprovedAsset || detail.currentBaseAsset;
    if (!baseAsset) return NextResponse.json({ error: 'Base asset not found' }, { status: 400 });

    const { base64, mimeType } = await downloadAsset(baseAsset.blob_url);

    const stencilResult = await runTattooStencil({
      baseImageBase64: base64,
      mimeType,
      designIdLock: detail.activeLock?.design_id_lock || 'Locked design structure',
    });

    const buffer = Buffer.from(stencilResult.base64, 'base64');
    const blob = await put(`sessions/${sessionId}/stencil-${Date.now()}.png`, buffer, {
      contentType: stencilResult.mimeType,
      access: 'public',
    });

    const run = await createEditRun({
      sessionId,
      operation: 'Stencil',
      request: 'Production linework extraction',
      inputAssetId: baseAsset.id,
      outputUrl: blob.url,
      metadata: { phase: '4a' }
    });

    return NextResponse.json({ run });
  } catch (error: any) {
    console.error('Stencil Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
