import { auth } from '@/auth';
import { sql } from '@/lib/db';

export interface SessionAssetRecord {
  id: string;
  project_id: string;
  kind: string;
  blob_url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  source_asset_id: string | null;
  created_by_phase: string | null;
  created_at: string;
  role?: 'reference' | 'base_v1' | 'former_base' | 'mask' | 'export';
  lock_status?: 'locked' | 'unlocked';
}

export interface SessionLockRecord {
  id: string;
  source_asset_id: string | null;
  version: number;
  design_id_lock: string;
  style_id_lock: string;
  context_id_lock: string;
  camera_id_lock: string;
  composition_id_lock: string;
  tattoo_id_lock: string;
  placement_id_lock: string;
  is_active: boolean;
  model_name: string;
  prompt_contract_version: string;
  created_at: string;
  sourceAsset: SessionAssetRecord | null;
}

export interface SessionDetailRecord {
  session: {
    id: string;
    project_id: string;
    reference_asset_id: string;
    active_lock_id: string | null;
    latest_approved_asset_id: string | null;
    status: string;
    created_at: string;
    client_state?: Record<string, any> | null;
  };
  project: {
    id: string;
    owner_id: string;
    title: string;
    status: string;
    created_at: string;
    gallery_state: Record<string, unknown> | null;
  };
  referenceAsset: SessionAssetRecord | null;
  latestApprovedAsset: SessionAssetRecord | null;
  currentBaseAsset: SessionAssetRecord | null;
  selectedReferenceAsset: SessionAssetRecord | null;
  selectedReferenceLock: SessionLockRecord | null;
  activeLock: SessionLockRecord | null;
  locks: SessionLockRecord[];
  projectReferences: SessionAssetRecord[];
  editRuns: Array<{
    id: string;
    session_id: string;
    phase: string;
    base_asset_id: string;
    output_asset_id: string;
    lock_id: string;
    mask_asset_id: string | null;
    visual_delta_1: string;
    visual_delta_2: string | null;
    pose_delta: string | null;
    target_region_json: Record<string, unknown> | null;
    status: string;
    model_name: string;
    prompt_contract_version: string;
    created_at: string;
    baseAsset: (SessionAssetRecord) | null;
    outputAsset: (SessionAssetRecord) | null;
    maskAsset: (SessionAssetRecord) | null;
    isLatestApproved: boolean;
  }>;
}


export function listSessionAssets(detail: SessionDetailRecord): SessionAssetRecord[] {
  const assets = [
    detail.referenceAsset,
    detail.latestApprovedAsset,
    detail.currentBaseAsset,
    detail.selectedReferenceAsset,
    ...detail.projectReferences,
    ...detail.editRuns.flatMap((run) => [run.baseAsset, run.outputAsset, run.maskAsset]),
  ].filter(Boolean) as SessionAssetRecord[];

  return Array.from(new Map(assets.map((asset) => [asset.id, asset])).values());
}

export function resolveSessionAsset(detail: SessionDetailRecord, assetId?: string | null): SessionAssetRecord | null {
  if (!assetId) return null;
  return new Map(listSessionAssets(detail).map((asset) => [asset.id, asset])).get(assetId) ?? null;
}

export type OwnedSessionContextResult =
  | { ok: true; detail: SessionDetailRecord; userId: string }
  | { ok: false; status: 401 | 403 | 404; error: string };

export async function getOwnedSessionDetail(sessionId: string): Promise<OwnedSessionContextResult> {
  const sessionUser = await auth();
  
  if (!sessionUser?.user?.id) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  
  const userId = sessionUser.user.id;

  const sessions = await sql`
    SELECT id, project_id, reference_asset_id, active_lock_id, latest_approved_asset_id, status, created_at, client_state
    FROM design_sessions
    WHERE id = ${sessionId}
  ` as any[];


  const session = sessions[0];
  if (!session) {
    return { ok: false, status: 404, error: 'Session not found' };
  }

  const projects = await sql`
    SELECT id, owner_id, title, status, created_at, gallery_state
    FROM projects
    WHERE id = ${session.project_id}
  ` as any[];

  const project = projects[0];
  if (!project) {
    return { ok: false, status: 404, error: 'Project not found' };
  }

  if (project.owner_id !== userId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const [locks, editRuns, projectReferences] = await Promise.all([
    sql`
      SELECT id, source_asset_id, version, design_id_lock, style_id_lock, context_id_lock, camera_id_lock, composition_id_lock, tattoo_id_lock, placement_id_lock, is_active, model_name, prompt_contract_version, created_at
      FROM locks
      WHERE session_id = ${sessionId}
      ORDER BY version DESC
      LIMIT 30
    ` as Promise<any[]>,
    sql`
      SELECT id, session_id, phase, base_asset_id, output_asset_id, lock_id, mask_asset_id, visual_delta_1, visual_delta_2, pose_delta, target_region_json, status, model_name, prompt_contract_version, created_at
      FROM edit_runs
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT 30
    ` as Promise<any[]>,
    sql`
      SELECT a.id, a.project_id, a.kind, a.blob_url, a.mime_type, a.width, a.height, a.source_asset_id, a.created_by_phase, a.created_at
      FROM assets a
      JOIN projects p ON a.project_id = p.id
      WHERE p.owner_id = ${userId} AND a.project_id = ${session.project_id} AND a.kind = 'reference'
      ORDER BY a.created_at DESC
      LIMIT 100
    ` as Promise<any[]>,
  ]);

  const assetIds = new Set<string>();
  if (session.reference_asset_id) assetIds.add(session.reference_asset_id);
  if (session.latest_approved_asset_id) assetIds.add(session.latest_approved_asset_id);

  for (const asset of projectReferences) {
    if (asset.id) assetIds.add(asset.id);
  }

  for (const ls of locks) {
    if (ls.source_asset_id) assetIds.add(ls.source_asset_id);
  }

  for (const run of editRuns) {
    assetIds.add(run.base_asset_id);
    if (run.output_asset_id) assetIds.add(run.output_asset_id);
    if (run.mask_asset_id) assetIds.add(run.mask_asset_id);
  }

  let assets: SessionAssetRecord[] = [];
  if (assetIds.size > 0) {
    assets = await sql`
      SELECT id, project_id, kind, blob_url, mime_type, width, height, source_asset_id, created_by_phase, created_at
      FROM assets
      WHERE id = ANY(${Array.from(assetIds)})
    ` as any as SessionAssetRecord[];
  }

  const assetsById = new Map(assets.map((a) => [a.id, a]));

  const normalizedLocks: SessionLockRecord[] = locks.map((ls: any) => ({
    ...ls,
    sourceAsset: ls.source_asset_id ? (assetsById.get(ls.source_asset_id) ?? null) : null,
  }));

  const referenceAsset = assetsById.get(session.reference_asset_id) ?? null;
  const latestApprovedAsset = session.latest_approved_asset_id
    ? (assetsById.get(session.latest_approved_asset_id) ?? null)
    : null;
  const currentBaseAsset = latestApprovedAsset;
  const generatedOutputIds = new Set(editRuns.map((run: any) => run.output_asset_id).filter(Boolean));
  const lockedAssetIds = new Set(normalizedLocks.map((lock) => lock.source_asset_id).filter(Boolean));

  const normalizedProjectReferences: SessionAssetRecord[] = (projectReferences as SessionAssetRecord[]).map((asset) => {
    const hydrated = assetsById.get(asset.id) ?? asset;
    const role: SessionAssetRecord['role'] = hydrated.kind === 'mask'
      ? 'mask'
      : hydrated.kind === 'export'
        ? 'export'
        : hydrated.id === currentBaseAsset?.id
          ? 'base_v1'
          : generatedOutputIds.has(hydrated.id)
            ? 'former_base'
            : 'reference';

    return {
      ...hydrated,
      role,
      lock_status: lockedAssetIds.has(hydrated.id) ? 'locked' : 'unlocked',
    };
  });

  const selectedReferenceLock = referenceAsset
    ? (normalizedLocks.find((ls) => ls.source_asset_id === referenceAsset.id) ?? null)
    : null;

  return {
    ok: true,
    userId,
    detail: {
      session: session as any,
      project: project as any,
      referenceAsset,
      latestApprovedAsset,
      currentBaseAsset,
      selectedReferenceAsset: referenceAsset,
      selectedReferenceLock,
      activeLock: normalizedLocks.find((ls) => ls.id === session.active_lock_id) ?? null,
      locks: normalizedLocks,
      projectReferences: normalizedProjectReferences,
      editRuns: editRuns.map((run: any) => ({
        ...run,
        baseAsset: assetsById.get(run.base_asset_id) ?? null,
        outputAsset: assetsById.get(run.output_asset_id) ?? null,
        maskAsset: run.mask_asset_id ? (assetsById.get(run.mask_asset_id) ?? null) : null,
        isLatestApproved: run.output_asset_id === session.latest_approved_asset_id,
      })),
    },
  };
}
