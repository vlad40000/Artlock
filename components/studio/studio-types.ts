import type { PieceState, DesignPhase } from '@/types/domain';
import type { Operation } from './studio-sidebar';

// ── Persisted client state shape ─────────────────────────────────────────────

export type PersistedStudioClientState = {
  piece?: Partial<PieceState>;
  past?: Partial<PieceState>[];
  future?: Partial<PieceState>[];
  operation?: Operation;
  activeDrawer?: string | null;
  brushSize?: number;
  maskMode?: 'draw' | 'erase';
  request?: string;
  maskAssetId?: string | null;
  regionHint?: string | null;
  maskType?: 'include' | 'exclude';
  showMask?: boolean;
  dockPosition?: { x: number; y: number };
  dockItems?: string[];
  activePhase?: DesignPhase;
  previewAssetId?: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const DESIGN_PHASES = new Set<DesignPhase>([
  'reference', 'extract', 'surgical', 'creative', 'variants', 'stencil', 'marketing', 'mockup',
]);

export const OPERATIONS = new Set<Operation>([
  'Extract', 'Surgical', 'Creative', 'Variant', 'Stencil', 'Mockup', 'Turnaround', 'QA',
]);

export const DOCK_ACTIONS = new Set([
  'menu', 'locks', 'refs', 'layers', 'qa', 'export', 'relock', 'mask', 'undo', 'redo',
]);

// ── Sanitize helpers ──────────────────────────────────────────────────────────

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null | undefined {
  return typeof value === 'string' ? value : value === null ? null : undefined;
}

function optionalPercent(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : undefined;
}

export function sanitizePersistedClientState(value: unknown): PersistedStudioClientState {
  if (!isRecord(value)) return {};

  const piece = isRecord(value.piece) ? value.piece as Partial<PieceState> : undefined;
  const past = Array.isArray(value.past) ? value.past.filter(isRecord) as Partial<PieceState>[] : undefined;
  const future = Array.isArray(value.future) ? value.future.filter(isRecord) as Partial<PieceState>[] : undefined;
  const operation = typeof value.operation === 'string' && OPERATIONS.has(value.operation as Operation)
    ? value.operation as Operation : undefined;
  const maskMode = value.maskMode === 'draw' || value.maskMode === 'erase' ? value.maskMode : undefined;
  const maskType = value.maskType === 'include' || value.maskType === 'exclude' ? value.maskType : undefined;
  const activePhase = typeof value.activePhase === 'string' && DESIGN_PHASES.has(value.activePhase as DesignPhase)
    ? value.activePhase as DesignPhase : undefined;
  const dockPosition = isRecord(value.dockPosition)
    && typeof value.dockPosition.x === 'number' && typeof value.dockPosition.y === 'number'
    && Number.isFinite(value.dockPosition.x) && Number.isFinite(value.dockPosition.y)
      ? { x: value.dockPosition.x, y: value.dockPosition.y } : undefined;
  const dockItems = Array.isArray(value.dockItems)
    ? value.dockItems.filter((item): item is string => typeof item === 'string' && DOCK_ACTIONS.has(item)).slice(0, 8)
    : undefined;

  return {
    piece, past, future, operation,
    activeDrawer: optionalString(value.activeDrawer),
    brushSize: optionalPercent(value.brushSize),
    maskMode,
    request: typeof value.request === 'string' ? value.request : undefined,
    maskAssetId: optionalString(value.maskAssetId),
    regionHint: optionalString(value.regionHint),
    maskType,
    showMask: typeof value.showMask === 'boolean' ? value.showMask : undefined,
    dockPosition, dockItems, activePhase,
    previewAssetId: optionalString(value.previewAssetId),
  };
}
