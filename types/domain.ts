export type DesignPhase =
  | 'reference'
  | 'extract'
  | 'surgical'
  | 'creative'
  | 'variants'
  | 'stencil'
  | 'marketing'
  | 'mockup';

export interface EditLayer {
  id: string;
  name: string;
  image: string;
  visible: boolean;
  opacity: number;
  assetCode?: string;
}

export interface LockArtifacts {
  designLockRaw: string;
  styleLockRaw: string;
  fullRaw: string;
}

export interface MediaLockMetadata {
  designId: string | null;
  styleId: string | null;
  lockArtifacts: LockArtifacts | null;
  lockedImage: string | null;
  locksExtracted?: boolean;
  locksActive?: boolean;
}

export interface Deliverable {
  id: string;
  type: string;
  name: string;
  format: 'png' | 'pdf' | 'zip' | 'url' | 'json';
  url: string;
  timestamp: string;
  version: number;
  size?: string;
  metadata?: any;
}

export interface Preset {
  id: string;
  category: 'caption' | 'hashtags' | 'stencil' | 'variants';
  name: string;
  content: any;
  isCustom?: boolean;
}

export interface ReferencePromptParam {
  title?: string;
  promptLine?: string;
}

export interface PieceState {
  id?: string;
  clientId?: string;
  referenceImages: string[];
  baseImage: string | null;

  // Active lock state
  designId: string | null;
  styleId: string | null;
  lockArtifacts: LockArtifacts | null;
  lockedImage: string | null;
  locksExtracted?: boolean;
  locksActive?: boolean;

  // Media-specific persistence
  mediaLocks?: Record<string, MediaLockMetadata>;

  editLayers: EditLayer[];

  variants: {
    name: string;
    delta: string;
    image: string;
    assetCode?: string;
  }[];

  stencil: string | null;
  stencilAssetCode?: string;

  skinMockup: string | null;
  skinMockupAssetCode?: string;

  surgicalRefImage?: string | null;
  surgicalEdits?: { x: number; y: number; color: string; label?: string }[];
  activePhase?: DesignPhase;
  lastUpdate?: string;

  // Mask & Region state
  maskAssetId?: string | null;
  regionHint?: string | null;
  maskType?: 'include' | 'exclude';

  // Design Parameters (tracked in history)
  request?: string;
  activeReferenceIds?: string[];
  referencePromptParams?: Record<string, ReferencePromptParam>;

  deliverables?: Deliverable[];
  presets?: Preset[];
  styleTemplate?: string;
  designSurfaceDocument?: any; // To be refined if needed
}

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
