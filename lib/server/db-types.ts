/**
 * Typed row interfaces for raw SQL query results.
 * These map directly to DB column names returned by Neon queries.
 */

export interface AssetRow {
  id: string;
  project_id: string;
  kind: string;
  blob_url: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  source_asset_id: string | null;
  created_by_phase: string | null;
  created_at: string;
}

export interface LockRow {
  id: string;
  session_id: string;
  source_asset_id: string;
  version: number;
  design_id_lock: string;
  style_id_lock: string;
  context_id_lock: string;
  camera_id_lock: string;
  composition_id_lock: string;
  tattoo_id_lock: string;
  placement_id_lock: string;
  is_active: boolean;
  model_name: string | null;
  prompt_contract_version: string | null;
  created_at: string;
}

export interface EditRunRow {
  id: string;
  session_id: string;
  phase: string;
  base_asset_id: string;
  output_asset_id: string;
  lock_id: string;
  mask_asset_id: string | null;
  visual_delta_1: string | null;
  visual_delta_2: string | null;
  pose_delta: string | null;
  target_region_json: Record<string, unknown> | null;
  status: string;
  model_name: string | null;
  prompt_contract_version: string | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  project_id: string;
  reference_asset_id: string | null;
  active_lock_id: string | null;
  latest_approved_asset_id: string | null;
  status: string;
  client_state: Record<string, unknown> | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  owner_id: string;
  title: string;
  status: string;
  gallery_state: Record<string, unknown> | null;
  created_at: string;
}

export interface IdRow { id: string; }
export interface VersionRow { id: string; version: number; }
export interface ActiveLockIdRow { active_lock_id: string | null; }
