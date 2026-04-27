import { randomUUID } from 'node:crypto';
import { sql } from '@/lib/db';

export interface CreateEditRunArgs {
  sessionId: string;
  operation: string;
  request: string;
  inputAssetId: string;
  outputUrl: string;
  metadata: Record<string, any>;
}

/**
 * createEditRun - Standard helper to persist a session edit run and its output asset.
 */
export async function createEditRun(args: CreateEditRunArgs) {
  const outputAssetId = randomUUID();
  const editRunId = randomUUID();

  // 1. Get session/project context to associate the asset correctly
  const sessionRows = await sql`
    SELECT project_id, active_lock_id
    FROM design_sessions
    WHERE id = ${args.sessionId}
  ` as any[];

  if (sessionRows.length === 0) {
    throw new Error('Session context lost during edit-run persistence');
  }

  const { project_id, active_lock_id } = sessionRows[0];

  // 2. Create the output asset record
  await sql`
    INSERT INTO assets (
      id, project_id, kind, blob_url, mime_type, created_by_phase, source_asset_id
    ) VALUES (
      ${outputAssetId}, ${project_id}, 'generated', ${args.outputUrl}, 'image/png', 
      ${args.metadata.phase || 'legacy'}, ${args.inputAssetId}
    )
  `;

  // 3. Create the edit run record
  await sql`
    INSERT INTO edit_runs (
      id, session_id, phase, base_asset_id, output_asset_id, 
      lock_id, visual_delta_1, status, model_name, prompt_contract_version,
      target_region_json
    ) VALUES (
      ${editRunId}, ${args.sessionId}, ${args.metadata.phase || 'legacy'}, 
      ${args.inputAssetId}, ${outputAssetId}, ${active_lock_id}, 
      ${args.operation}, 'succeeded', 'gemini-3.1-flash', 'v2.0',
      ${JSON.stringify(args.metadata)}
    )
  `;

  return {
    id: editRunId,
    session_id: args.sessionId,
    output_asset_id: outputAssetId,
    status: 'succeeded'
  };
}
