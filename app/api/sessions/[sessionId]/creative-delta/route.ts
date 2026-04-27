import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { runTattooCreativeDelta } from '@/lib/ai/gemini';
import { downloadAssetAsBase64, uploadGeneratedAsset } from '@/lib/utils/storage';
import { TATTOO_PHASE_1C } from '@/lib/ai/prompt-contracts/tattoo-phase-1c';
import { env } from '@/lib/utils/env';
import { getOwnedSessionDetail, resolveSessionAsset } from '@/lib/server/session-detail';
import { getImageDimensions } from '@/lib/utils/image-dimensions';
import { resolveFromControls } from '@/lib/ai/generation-profiles';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const bodySchema = z.object({
  transformation: z.string().min(3).max(700),
  intensity: z.enum(['low', 'medium', 'high']).default('high'),
  exclusions: z.string().max(500).optional().nullable(),
  baseAssetId: z.string().uuid().optional().nullable(),
  referenceAssetId: z.string().uuid().optional().nullable(),
  transferInstruction: z.string().max(700).optional().nullable(),
  transferMode: z.enum(['none', 'reference_transfer', 'locked_reference_transfer']).optional().default('none'),
  designFidelity: z.number().min(0).max(1).optional(),
  detailLoad: z.number().min(0).max(1).optional(),
  symmetryLock: z.boolean().optional(),
  tattooMode: z.boolean().optional(),
  generationPresetId: z.string().max(50).optional(),
  variancePreset: z.enum(['Locked', 'Balanced', 'Creative']).optional(),
  maskAssetId: z.string().uuid().optional().nullable(),
  maskType: z.enum(['include', 'exclude']).optional(),
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

    if (!lock || 
        !lock.design_id_lock || 
        !lock.style_id_lock || 
        !lock.context_id_lock || 
        !lock.camera_id_lock || 
        !lock.composition_id_lock || 
        !lock.tattoo_id_lock || 
        !lock.placement_id_lock) {
      return NextResponse.json({ 
        error: 'Canonical Pipeline Violation: Incomplete lockset detected. All 7 locks (Design, Style, Context, Camera, Composition, Tattoo, Placement) are required for Zero-Drift operation. Run Phase 1A extraction first.' 
      }, { status: 400 });
    }

    const baseAsset =
      resolveSessionAsset(detail, body.baseAssetId) ??
      detail.currentBaseAsset ??
      detail.latestApprovedAsset ??
      detail.referenceAsset;

    if (!baseAsset) {
      return NextResponse.json({ error: 'Base asset not found' }, { status: 404 });
    }

    const baseLock = detail.locks.find((l) => l.source_asset_id === baseAsset.id) ?? lock;

    const referenceAsset = resolveSessionAsset(detail, body.referenceAssetId);
    const referenceLock = referenceAsset
      ? (detail.locks.find((lock) => lock.source_asset_id === referenceAsset.id) ?? null)
      : null;
    const transferMode = referenceAsset ? body.transferMode : 'none';

    const sourceImage = await downloadAssetAsBase64(baseAsset.blob_url);
    const referenceImage = referenceAsset ? await downloadAssetAsBase64(referenceAsset.blob_url) : null;

    let maskAsset = null;
    if (body.maskAssetId) {
      const masks = await sql`
        SELECT id, project_id, kind, blob_url, mime_type, width, height, source_asset_id, created_by_phase, created_at
        FROM assets
        WHERE id = ${body.maskAssetId} AND project_id = ${detail.project.id} AND kind = 'mask'
      `;
      maskAsset = masks[0] ?? null;
    }
    const maskImage = maskAsset ? await downloadAssetAsBase64(maskAsset.blob_url) : null;


    // Resolve generation profile — server-side temperature/topP
    const profile = resolveFromControls({
      operation: 'creative',
      generationPresetId: body.generationPresetId,
      variancePreset: body.variancePreset,
    });

    const edited = await runTattooCreativeDelta({
      baseImageBase64: sourceImage.base64,
      mimeType: baseAsset.mime_type || sourceImage.mimeType,
      designIdLock: baseLock.design_id_lock,
      styleIdLock: baseLock.style_id_lock,
      contextIdLock: baseLock.context_id_lock,
      cameraIdLock: baseLock.camera_id_lock,
      compositionIdLock: baseLock.composition_id_lock,
      tattooIdLock: baseLock.tattoo_id_lock,
      placementIdLock: baseLock.placement_id_lock,
      transformation: body.transformation,
      intensity: body.intensity,
      exclusions: body.exclusions,
      referenceImageBase64: referenceImage?.base64 ?? null,
      referenceMimeType: referenceAsset?.mime_type || referenceImage?.mimeType || null,
      referenceDesignIdLock: referenceLock?.design_id_lock ?? null,
      referenceStyleIdLock: referenceLock?.style_id_lock ?? null,
      transferInstruction: body.transferInstruction ?? null,
      transferMode,
      maskImageBase64: maskImage?.base64 ?? null,
      maskMimeType: maskAsset?.mime_type ?? maskImage?.mimeType ?? null,
      maskType: body.maskType,
      designFidelity: body.designFidelity,
      detailLoad: body.detailLoad,
      symmetryLock: body.symmetryLock,
      tattooMode: body.tattooMode,
      temperature: profile.temperature,
    });


    const outputDimensions = getImageDimensions(Buffer.from(edited.base64, 'base64'), edited.mimeType);

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
        ${outputAssetId}, ${detail.project.id}, 'generated', ${blobUrl}, ${edited.mimeType}, ${outputDimensions?.width ?? baseAsset.width}, ${outputDimensions?.height ?? baseAsset.height}, ${baseAsset.id}, '1C'
      )
    `;

    const editRunId = randomUUID();
    await sql`
      INSERT INTO edit_runs (
        id, session_id, phase, base_asset_id, output_asset_id, lock_id, mask_asset_id,
        visual_delta_1, visual_delta_2, pose_delta, target_region_json, status, model_name, prompt_contract_version
      ) VALUES (
        ${editRunId}, ${sessionId}, '1C', ${baseAsset.id}, ${outputAssetId}, ${baseLock.id}, null,
        ${body.transformation}, null, 'none',
        ${JSON.stringify({
          intensity: body.intensity,
          exclusions: body.exclusions ?? null,
          referenceAssetId: referenceAsset?.id ?? null,
          referenceLockId: referenceLock?.id ?? null,
          transferInstruction: body.transferInstruction ?? null,
          transferMode,
        })},
        'succeeded', ${env.geminiImageModel}, ${TATTOO_PHASE_1C.version}
      )
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: { editRunId, outputAssetId },
      prompt_contract: { name: TATTOO_PHASE_1C.name, version: TATTOO_PHASE_1C.version, model: env.geminiImageModel },
      params: {
        transformation: body.transformation,
        intensity: body.intensity,
        exclusions: body.exclusions ?? null,
        referenceAssetId: referenceAsset?.id ?? null,
        transferMode,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'creative-delta' });
  }
}
