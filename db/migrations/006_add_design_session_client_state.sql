ALTER TABLE design_sessions
  ADD COLUMN IF NOT EXISTS client_state JSONB NOT NULL DEFAULT '{}'::jsonb;
