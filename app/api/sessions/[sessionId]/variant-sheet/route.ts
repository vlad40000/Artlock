import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { runTattooVariantSheet } from '@/lib/ai/gemini';
import { TATTOO_PHASE_3 } from '@/lib/ai/prompt-contracts/tattoo-phase-3';
import { apiErrorResponse } from '@/lib/server/api-error';
import { getOwnedSessionDetail, resolveSessionAsset } from '@/lib/server/session-detail';
import { resolveFromControls } from '@/lib/ai/generation-profiles';
import { downloadAsset, uploadGeneratedAsset } from '@/lib/utils/storage';
import { getImageDimensions } from '@/lib/utils/image-dimensions';
import { env } from '@/lib/utils/env';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const bodySchema = z.object({
  baseAssetId: z.string().uuid().optional().nullable(),
  constraints: z.string().max(700).optional().nullable(),
  layout: z.literal('single').optional().default('single'),
  generationPresetId: z.string().max(50).optional(),
  variancePreset: z.enum(['Locked', 'Balanced', 'Creative']).optional(),
});

function formatAspectRatio(width: number, height: number) {
  return `${width}:${height}`;
}

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

    if (
      !lock ||
      !lock.design_id_lock ||
      !lock.style_id_lock ||
      !lock.context_id_lock ||
      !lock.camera_id_lock ||
      !lock.composition_id_lock ||
      !lock.tattoo_id_lock ||
      !lock.placement_id_lock
    ) {
      return NextResponse.json(
        {
          error:
            'Canonical Pipeline Violation: Incomplete lockset detected. All 7 locks are required before Phase 3. Run Phase 1A extraction first.',
        },
        { status: 400 },
      );
    }

    const baseAsset =
      resolveSessionAsset(detail, body.baseAssetId) ??
      detail.latestApprovedAsset ??
      detail.currentBaseAsset ??
      detail.referenceAsset;

    if (!baseAsset) {
      return NextResponse.json({ error: 'Reference design asset not found' }, { status: 404 });
    }

    const sourceImage = await downloadAsset(baseAsset.blob_url);
    const baseWidth = baseAsset.width ?? getImageDimensions(sourceImage.buffer, sourceImage.mimeType)?.width ?? null;
    const baseHeight = baseAsset.height ?? getImageDimensions(sourceImage.buffer, sourceImage.mimeType)?.height ?? null;

    if (!baseWidth || !baseHeight) {
      return NextResponse.json(
        { error: 'Strict canvas lock failed: source dimensions could not be resolved.' },
        { status: 400 },
      );
    }

    const baseLock = detail.locks.find((candidate) => candidate.source_asset_id === baseAsset.id) ?? lock;
    const profile = resolveFromControls({
      operation: 'creative',
      generationPresetId: body.generationPresetId,
      variancePreset: body.variancePreset,
    });

    const edited = await runTattooVariantSheet({
      baseImageBase64: sourceImage.base64,
      mimeType: baseAsset.mime_type || sourceImage.mimeType,
      designIdLock: baseLock.design_id_lock,
      styleIdLock: baseLock.style_id_lock,
      aspectRatio: formatAspectRatio(baseWidth, baseHeight),
      resolution: `${baseWidth}x${baseHeight}`,
      constraints: body.constraints,
      temperature: profile.temperature,
    });

    const outputDimensions =
      getImageDimensions(Buffer.from(edited.base64, 'base64'), edited.mimeType) ?? {
        width: baseWidth,
        height: baseHeight,
      };

    const outputAssetId = randomUUID();
    const blobPath = `sessions/${sessionId}/generated/${outputAssetId}.png`;
    const blobUrl = await uploadGeneratedAsset({
      path: blobPath,
      base64: edited.base64,
      mimeType: edited.mimeType,
    });

    await sql`
      INSERT INTO assets (
        id, project_id, kind, blob_url, mime_type, width, height, source_asset_id, created_by_phase
      ) VALUES (
        ${outputAssetId}, ${detail.project.id}, 'generated', ${blobUrl}, ${edited.mimeType},
        ${outputDimensions.width ?? baseWidth}, ${outputDimensions.height ?? baseHeight}, ${baseAsset.id}, '3'
      )
    `;

    const editRunId = randomUUID();
    await sql`
      INSERT INTO edit_runs (
        id, session_id, phase, base_asset_id, output_asset_id, lock_id, mask_asset_id,
        visual_delta_1, visual_delta_2, pose_delta, target_region_json, status, model_name, prompt_contract_version
      ) VALUES (
        ${editRunId}, ${sessionId}, '3', ${baseAsset.id}, ${outputAssetId}, ${baseLock.id}, null,
        ${'Variant Sheet: LINEWORK / BLACK & GREY / COLOR'}, ${body.constraints ?? null}, 'none',
        ${JSON.stringify({
          layout: body.layout,
          outputs: ['linework', 'black_grey', 'color_or_blackwork'],
          constraints: body.constraints ?? null,
        })},
        'succeeded', ${env.geminiImageModel}, ${TATTOO_PHASE_3.version}
      )
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: { editRunId, outputAssetId },
      prompt_contract: {
        name: TATTOO_PHASE_3.name,
        version: TATTOO_PHASE_3.version,
        model: env.geminiImageModel,
      },
      params: {
        baseAssetId: baseAsset.id,
        constraints: body.constraints ?? null,
        layout: body.layout,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'variant-sheet' });
  }
}
