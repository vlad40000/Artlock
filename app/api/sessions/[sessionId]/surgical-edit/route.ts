import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/server/api-error';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { runTattooSurgicalEdit } from '@/lib/ai/gemini';
import { downloadAsset, uploadGeneratedAsset } from '@/lib/utils/storage';
import { TATTOO_PHASE_1B } from '@/lib/ai/prompt-contracts/tattoo-phase-1b';
import { env } from '@/lib/utils/env';
import { getOwnedSessionDetail, resolveSessionAsset } from '@/lib/server/session-detail';
import { getImageDimensions } from '@/lib/utils/image-dimensions';
import { resolveFromControls } from '@/lib/ai/generation-profiles';
import {
  MASK_DRIFT_ERROR_MESSAGE,
  clampEditToMask,
  validateServerMaskDrift,
} from '@/lib/image/server-mask-drift';

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const bodySchema = z.object({
  delta1: z.string().min(3).max(500),
  delta2: z.string().max(500).optional().nullable(),
  baseAssetId: z.string().uuid().optional().nullable(),
  maskAssetId: z.string().uuid().optional().nullable(),
  referenceAssetId: z.string().uuid().optional().nullable(),
  regionHint: z.string().max(500).optional().nullable(),
  designFidelity: z.number().min(0).max(1).optional(),
  detailLoad: z.number().min(0).max(1).optional(),
  symmetryLock: z.boolean().optional(),
  tattooMode: z.boolean().optional(),
  generationPresetId: z.string().max(50).optional(),
  variancePreset: z.enum(['Locked', 'Balanced', 'Creative']).optional(),
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

    // Find the base asset to work from. Prefer the shared hydrated session resolver;
    // keep a DB fallback for assets not included in the current detail payload.
    const fallbackBaseAsset =
      resolveSessionAsset(detail, body.baseAssetId) ??
      detail.latestApprovedAsset ??
      detail.referenceAsset;

    let baseAsset = fallbackBaseAsset;
    if (body.baseAssetId && body.baseAssetId !== fallbackBaseAsset?.id) {
      const assets = await sql`
        SELECT id, project_id, kind, blob_url, mime_type, width, height, source_asset_id, created_by_phase, created_at
        FROM assets
        WHERE id = ${body.baseAssetId} AND project_id = ${detail.project.id}
      `;
      if (assets[0]) {
        baseAsset = assets[0] as any;
      }
    }

    if (!baseAsset) {
      return NextResponse.json({ error: 'Base asset not found' }, { status: 404 });
    }

    // Find the mask asset if provided
    let maskAsset = null;
    if (body.maskAssetId) {
      const masks = await sql`
        SELECT id, project_id, kind, blob_url, mime_type, width, height, source_asset_id, created_by_phase, created_at
        FROM assets
        WHERE id = ${body.maskAssetId} AND project_id = ${detail.project.id} AND kind = 'mask'
      `;
      maskAsset = masks[0] ?? null;
    }

    // Download images for Gemini
    const sourceImage = await downloadAsset(baseAsset.blob_url);
    const maskImage = maskAsset
      ? await downloadAsset(maskAsset.blob_url)
      : null;
    const referenceAsset = resolveSessionAsset(detail, body.referenceAssetId);
    const referenceLock = referenceAsset
      ? (detail.locks.find((lock) => lock.source_asset_id === referenceAsset.id) ?? null)
      : null;
    const referenceImage = referenceAsset
      ? await downloadAsset(referenceAsset.blob_url)
      : null;

    // Resolve generation profile — server-side temperature/topP
    const profile = resolveFromControls({
      operation: 'surgical',
      generationPresetId: body.generationPresetId,
      variancePreset: body.variancePreset,
    });

    // Run AI generation
    const edited = await runTattooSurgicalEdit({
      baseImageBase64: sourceImage.base64,
      mimeType: baseAsset.mime_type || sourceImage.mimeType,
      designIdLock: lock.design_id_lock,
      styleIdLock: lock.style_id_lock,
      contextIdLock: lock.context_id_lock,
      cameraIdLock: lock.camera_id_lock,
      compositionIdLock: lock.composition_id_lock,
      tattooIdLock: lock.tattoo_id_lock,
      placementIdLock: lock.placement_id_lock,
      referenceImageBase64: referenceImage?.base64 ?? null,
      referenceMimeType: referenceAsset?.mime_type || referenceImage?.mimeType || null,
      referenceDesignIdLock: referenceLock?.design_id_lock ?? null,
      referenceStyleIdLock: referenceLock?.style_id_lock ?? null,
      referenceAssistMode: referenceAsset ? (referenceLock ? 'locked_reference_assist' : 'reference_assist') : 'none',
      delta1: body.delta1,
      delta2: body.delta2,
      regionHint: body.regionHint,
      maskImageBase64: maskImage?.base64 ?? null,
      maskMimeType: maskAsset?.mime_type ?? maskImage?.mimeType ?? null,
      designFidelity: body.designFidelity,
      detailLoad: body.detailLoad,
      symmetryLock: body.symmetryLock,
      tattooMode: body.tattooMode,
      maskType: body.maskType,
      temperature: profile.temperature,
    });

    let editedBuffer: Buffer = Buffer.from(edited.base64, 'base64');
    let editedBase64 = edited.base64;
    let editedMimeType = edited.mimeType;
    let outputDimensions = getImageDimensions(editedBuffer, editedMimeType);
    let driftValidation:
      | {
          mode: 'unmasked';
          dimensionsMatch: boolean;
          width: number | null;
          height: number | null;
        }
      | {
          mode: 'masked';
          dimensionsMatch: boolean;
          width: number | null;
          height: number | null;
          changedPixels: number;
          outsideMaskPixels: number;
          outsideMaskFraction: number;
          changedBounds: unknown;
          outsideMaskBounds: unknown;
          driftDetected: boolean;
        };

    if (
      outputDimensions &&
      baseAsset.width &&
      baseAsset.height &&
      (outputDimensions.width !== baseAsset.width || outputDimensions.height !== baseAsset.height)
    ) {
      return NextResponse.json({ error: MASK_DRIFT_ERROR_MESSAGE }, { status: 400 });
    }

    driftValidation = {
      mode: 'unmasked',
      dimensionsMatch: true,
      width: outputDimensions?.width ?? baseAsset.width ?? null,
      height: outputDimensions?.height ?? baseAsset.height ?? null,
    };

    if (maskImage) {
      editedBuffer = await clampEditToMask({
        baseBuffer: sourceImage.buffer,
        editedBuffer,
        maskBuffer: maskImage.buffer,
        maskType: body.maskType,
      });
      editedBase64 = editedBuffer.toString('base64');
      editedMimeType = 'image/png';
      outputDimensions = getImageDimensions(editedBuffer, editedMimeType);

      const driftResult = await validateServerMaskDrift({
        baseBuffer: sourceImage.buffer,
        editedBuffer,
        maskBuffer: maskImage.buffer,
        maskType: body.maskType,
      });

      driftValidation = {
        mode: 'masked',
        dimensionsMatch: driftResult.dimensionsMatch,
        width: driftResult.width,
        height: driftResult.height,
        changedPixels: driftResult.changedPixels,
        outsideMaskPixels: driftResult.outsideMaskPixels,
        outsideMaskFraction: driftResult.outsideMaskFraction,
        changedBounds: driftResult.changedBounds,
        outsideMaskBounds: driftResult.outsideMaskBounds,
        driftDetected: driftResult.drifted,
      };

      if (!driftResult.dimensionsMatch || driftResult.drifted) {
        return NextResponse.json(
          { error: MASK_DRIFT_ERROR_MESSAGE, driftValidation },
          { status: 400 },
        );
      }
    }

    // Upload result to Vercel Blob
    const outputAssetId = randomUUID();
    const blobPath = `sessions/${sessionId}/generated/${outputAssetId}.png`;
    const blobUrl = await uploadGeneratedAsset({
      path: blobPath,
      base64: editedBase64,
      mimeType: editedMimeType,
    });

    // Save asset metadata to Neon
    await sql`
      INSERT INTO assets (
        id, project_id, kind, blob_url, mime_type, 
        width, height, source_asset_id, created_by_phase
      ) VALUES (
        ${outputAssetId}, ${detail.project.id}, 'generated', ${blobUrl}, ${editedMimeType},
        ${outputDimensions?.width ?? baseAsset.width}, ${outputDimensions?.height ?? baseAsset.height}, ${baseAsset.id}, '1B'
      )
    `;

    // Save edit run to Neon
    const editRunId = randomUUID();
    await sql`
      INSERT INTO edit_runs (
        id, session_id, phase, base_asset_id, output_asset_id, 
        lock_id, mask_asset_id, visual_delta_1, visual_delta_2, 
        pose_delta, target_region_json, status, model_name, 
        prompt_contract_version
      ) VALUES (
        ${editRunId}, ${sessionId}, '1B', ${baseAsset.id}, ${outputAssetId},
        ${lock.id}, ${maskAsset?.id ?? null}, ${body.delta1}, ${body.delta2 ?? null},
        'none', ${body.regionHint || maskAsset ? JSON.stringify({
          regionHint: body.regionHint ?? null,
          maskAssetId: maskAsset?.id ?? null,
          driftValidation,
        }) : JSON.stringify({ driftValidation })},
        'succeeded', ${env.geminiImageModel}, ${TATTOO_PHASE_1B.version}
      )
    `;

    return NextResponse.json({
      status: 'succeeded',
      artifacts: { editRunId, outputAssetId },
      prompt_contract: { name: TATTOO_PHASE_1B.name, version: TATTOO_PHASE_1B.version, model: env.geminiImageModel },
      inputs: {
        baseAssetId: baseAsset.id,
        activeLockId: lock.id,
        maskAssetId: maskAsset?.id ?? null,
        referenceAssetId: referenceAsset?.id ?? null,
      },
      driftValidation,
      params: { delta1: body.delta1, delta2: body.delta2 ?? null, poseDelta: 'none', regionHint: body.regionHint ?? null },
    });
  } catch (error) {
    return apiErrorResponse(error, { route: 'surgical-edit' });
  }
}
