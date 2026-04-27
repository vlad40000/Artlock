import { NextRequest, NextResponse } from 'next/server';
import { runTattooMockup } from '@/lib/ai/gemini';
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
    const { baseAssetId, placement, tattooMode } = body;

    const result = await getOwnedSessionDetail(sessionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const detail = result.detail;

    const baseAsset = resolveSessionAsset(detail, baseAssetId) || detail.latestApprovedAsset || detail.currentBaseAsset;
    if (!baseAsset) return NextResponse.json({ error: 'Base asset not found' }, { status: 400 });

    const { base64, mimeType } = await downloadAsset(baseAsset.blob_url);

    const mockupResult = await runTattooMockup({
      baseImageBase64: base64,
      mimeType,
      placement: placement || 'Forearm',
      tattooMode: tattooMode ?? true,
    });

    const buffer = Buffer.from(mockupResult.base64, 'base64');
    const blob = await put(`sessions/${sessionId}/mockup-${Date.now()}.png`, buffer, {
      contentType: mockupResult.mimeType,
      access: 'public',
    });

    const run = await createEditRun({
      sessionId,
      operation: 'Mockup',
      request: `Placement: ${placement || 'Forearm'}`,
      inputAssetId: baseAsset.id,
      outputUrl: blob.url,
      metadata: { phase: '5', placement }
    });

    return NextResponse.json({ run });
  } catch (error: any) {
    console.error('Mockup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
