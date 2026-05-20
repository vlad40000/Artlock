-- =============================================================
-- Migration 008 — Link flash_boards to a backing project
-- Each board gets a dedicated project for asset ownership.
-- =============================================================

ALTER TABLE flash_boards
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS flash_boards_project_id_idx ON flash_boards(project_id);
