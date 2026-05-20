-- =============================================================
-- Migration 007 — Flash Board
-- Adds: flash_boards, flash_themes, flash_designs
-- All idempotent (IF NOT EXISTS / IF NOT EXISTS columns)
-- =============================================================

-- ── flash_boards ──────────────────────────────────────────────
-- One board per artist theme/collection (e.g. "Traditional Americana", "Fine Line Botanicals")
CREATE TABLE IF NOT EXISTS flash_boards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      TEXT NOT NULL,                    -- app_user.id (TEXT matches existing pattern)
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'archived'
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flash_boards_owner_id_idx ON flash_boards(owner_id);

-- ── flash_themes ──────────────────────────────────────────────
-- Reusable style/motif DNA extracted from an existing tattoo.
-- A theme is the equivalent of the style lock for a flash collection.
CREATE TABLE IF NOT EXISTS flash_themes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flash_board_id        UUID NOT NULL REFERENCES flash_boards(id) ON DELETE CASCADE,
  source_asset_id       UUID REFERENCES assets(id) ON DELETE SET NULL,  -- the tattoo it was extracted from
  title                 TEXT NOT NULL,
  -- extracted theme fields (mirrors 1A structure but theme-scoped)
  style_family          TEXT,     -- 'traditional' | 'fine-line' | 'blackwork' | etc.
  palette_lock          TEXT,     -- verbatim colour description
  motif_lock            TEXT,     -- primary motif language (e.g. "botanical, flowing stems, no skulls")
  line_weight_lock      TEXT,     -- thin/medium/thick + specifics
  shading_lock          TEXT,     -- whip/pepper/smooth/none
  composition_rules     TEXT,     -- layout guidance (e.g. "portrait orientation, single subject, white bg")
  raw_theme_lock        TEXT,     -- full verbatim AI extraction output
  model_name            TEXT,
  prompt_contract_version TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flash_themes_board_id_idx ON flash_themes(flash_board_id);

-- ── flash_designs ─────────────────────────────────────────────
-- Individual design entries on a Flash Board.
-- Each design links to a Vercel Blob asset and optionally to the theme that generated it.
CREATE TABLE IF NOT EXISTS flash_designs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flash_board_id  UUID NOT NULL REFERENCES flash_boards(id) ON DELETE CASCADE,
  flash_theme_id  UUID REFERENCES flash_themes(id) ON DELETE SET NULL,
  asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  stencil_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,  -- linework/stencil version
  title           TEXT,
  tags            TEXT[],            -- artist-defined tags: style, body-area, size, etc.
  placement_hint  TEXT,              -- 'forearm' | 'chest' | etc.
  status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'ready' | 'archived'
  sort_order      INTEGER NOT NULL DEFAULT 0,
  generation_prompt TEXT,            -- what was asked when AI generated this
  is_ai_generated   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flash_designs_board_id_idx ON flash_designs(flash_board_id);
CREATE INDEX IF NOT EXISTS flash_designs_theme_id_idx ON flash_designs(flash_theme_id);
CREATE INDEX IF NOT EXISTS flash_designs_asset_id_idx ON flash_designs(asset_id);

-- ── assets.kind extension ─────────────────────────────────────
-- No column change needed — kind TEXT already accepts any value.
-- New kinds introduced: 'flash' | 'flash_stencil'
-- Documenting here for clarity.

COMMENT ON COLUMN assets.kind IS
  'reference | mask | generated | approved_base | flash | flash_stencil';
