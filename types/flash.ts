// ── Flash Board domain types ──────────────────────────────────

export interface FlashBoard {
  id: string;
  owner_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: 'active' | 'archived';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FlashTheme {
  id: string;
  flash_board_id: string;
  source_asset_id: string | null;
  title: string;
  style_family: string | null;
  palette_lock: string | null;
  motif_lock: string | null;
  line_weight_lock: string | null;
  shading_lock: string | null;
  composition_rules: string | null;
  raw_theme_lock: string | null;
  model_name: string | null;
  prompt_contract_version: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FlashDesign {
  id: string;
  flash_board_id: string;
  flash_theme_id: string | null;
  asset_id: string;
  stencil_asset_id: string | null;
  title: string | null;
  tags: string[];
  placement_hint: string | null;
  status: 'draft' | 'ready' | 'archived';
  sort_order: number;
  generation_prompt: string | null;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
  // joined
  blob_url?: string;
  stencil_blob_url?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface FlashBoardDetail {
  board: FlashBoard;
  themes: FlashTheme[];
  designs: FlashDesign[];
}
