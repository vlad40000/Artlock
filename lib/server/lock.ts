import { randomUUID } from 'node:crypto';
import { extractTattooLocks } from '@/lib/ai/gemini';
import { TATTOO_PHASE_1A } from '@/lib/ai/prompt-contracts/tattoo-phase-1a';
import { sql } from '@/lib/db';
import type { SessionAssetRecord } from '@/lib/server/session-detail';
import { downloadAssetAsBase64 } from '@/lib/storage';
import { parseLockBlocks } from '@/lib/utils/locks';
import { env } from '@/lib/utils/env';

export async function createLockFromAsset(args: {
  sessionId: string;
  sourceAsset: SessionAssetRecord;
  tattooMode?: boolean;
}) {
  const lockId = randomUUID();
  let parsed;
  let modelName = env.geminiPhase1AModel;
  let contractVersion = TATTOO_PHASE_1A.version;

  const existingRows = await sql`
    SELECT
      design_id_lock, style_id_lock, context_id_lock, camera_id_lock, composition_id_lock,
      tattoo_id_lock, placement_id_lock,
      model_name, prompt_contract_version
    FROM locks
    WHERE source_asset_id = ${args.sourceAsset.id}
    ORDER BY created_at DESC
    LIMIT 1
  ` as any[];

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    parsed = {
      designIdLock: existing.design_id_lock,
      styleIdLock: existing.style_id_lock,
      contextIdLock: existing.context_id_lock,
      cameraIdLock: existing.camera_id_lock,
      compositionIdLock: existing.composition_id_lock,
      tattooIdLock: existing.tattoo_id_lock,
      placementIdLock: existing.placement_id_lock,
    };
    modelName = existing.model_name || modelName;
    contractVersion = existing.prompt_contract_version || contractVersion;
  } else {
    const sourceImage = await downloadAssetAsBase64(args.sourceAsset.blob_url);
    const rawLockText = await extractTattooLocks({
      imageBase64: sourceImage.base64,
      mimeType: args.sourceAsset.mime_type || sourceImage.mimeType,
      tattooMode: args.tattooMode,
    });
    parsed = parseLockBlocks(rawLockText);
  }

  const rows = await sql`
    WITH next_version AS (
      SELECT COALESCE(MAX(version), 0) + 1 AS version
      FROM locks
      WHERE session_id = ${args.sessionId}
    ), deactivated AS (
      UPDATE locks
      SET is_active = false
      WHERE session_id = ${args.sessionId} AND is_active = true
    ), inserted AS (
      INSERT INTO locks (
        id, session_id, source_asset_id, version,
        design_id_lock, style_id_lock, context_id_lock, camera_id_lock, composition_id_lock,
        tattoo_id_lock, placement_id_lock,
        is_active, model_name, prompt_contract_version
      )
      SELECT
        ${lockId}, ${args.sessionId}, ${args.sourceAsset.id}, next_version.version,
        ${parsed.designIdLock}, ${parsed.styleIdLock}, ${parsed.contextIdLock}, ${parsed.cameraIdLock}, ${parsed.compositionIdLock},
        ${parsed.tattooIdLock}, ${parsed.placementIdLock},
        true, ${modelName}, ${contractVersion}
      FROM next_version
      RETURNING id, version
    ), session_updated AS (
      UPDATE design_sessions
      SET active_lock_id = (SELECT id FROM inserted)
      WHERE id = ${args.sessionId}
      RETURNING active_lock_id
    )
    SELECT inserted.id, inserted.version
    FROM inserted
    JOIN session_updated ON session_updated.active_lock_id = inserted.id
  ` as any[];

  const inserted = rows[0];
  if (!inserted) {
    throw new Error('Failed to create active lock');
  }

  return {
    lockId: inserted.id as string,
    version: Number(inserted.version),
    parsed,
  };
}
