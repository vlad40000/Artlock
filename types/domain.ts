export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type AssetKind = 'reference' | 'generated' | 'approved' | 'export' | 'mask';
export type JobKind = 'extract-locks' | 'surgical-edit' | 'creative-delta';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type EditPhase = '1B' | '1C';

export interface LockRecord {
  id: string;
  session_id: string;
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
}
