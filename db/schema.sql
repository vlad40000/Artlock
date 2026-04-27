-- Neon Schema for Artlock MVP

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom email/password auth users
CREATE TABLE IF NOT EXISTS app_user (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom httpOnly tls_session cookie backing store
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  gallery_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assets table (Metadata for files in Vercel Blob)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'reference', 'mask', 'generated', 'approved_base'
  blob_url TEXT NOT NULL,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  source_asset_id UUID REFERENCES assets(id),
  created_by_phase TEXT, -- 'intake', 'lock_extract', '1B', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Design Sessions table
CREATE TABLE IF NOT EXISTS design_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reference_asset_id UUID NOT NULL REFERENCES assets(id),
  active_lock_id UUID, -- Will be set after lock extraction
  latest_approved_asset_id UUID REFERENCES assets(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locks table
CREATE TABLE IF NOT EXISTS locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES design_sessions(id) ON DELETE CASCADE,
  source_asset_id UUID NOT NULL REFERENCES assets(id),
  version INTEGER NOT NULL DEFAULT 1,
  design_id_lock TEXT NOT NULL,
  style_id_lock TEXT NOT NULL,
  context_id_lock TEXT NOT NULL,
  camera_id_lock TEXT NOT NULL,
  composition_id_lock TEXT NOT NULL,
  tattoo_id_lock TEXT NOT NULL DEFAULT '',
  placement_id_lock TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT false,
  model_name TEXT,
  prompt_contract_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Edit Runs table (The 1B/Delta attempts)
CREATE TABLE IF NOT EXISTS edit_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES design_sessions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL, -- e.g., '1B'
  base_asset_id UUID NOT NULL REFERENCES assets(id),
  output_asset_id UUID NOT NULL REFERENCES assets(id),
  lock_id UUID NOT NULL REFERENCES locks(id),
  mask_asset_id UUID REFERENCES assets(id),
  visual_delta_1 TEXT,
  visual_delta_2 TEXT,
  pose_delta TEXT,
  target_region_json JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'succeeded', 'failed'
  model_name TEXT,
  prompt_contract_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table (For tracking long-running AI tasks if needed)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_id UUID REFERENCES design_sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES design_sessions(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id),
  lock_id UUID REFERENCES locks(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
