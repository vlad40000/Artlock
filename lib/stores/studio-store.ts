'use client';

import { create } from 'zustand';
import { PieceState } from '@/types/domain';
import { Operation } from '@/components/studio/studio-sidebar';

interface StudioStore {
  // --- Undoable Design State ---
  present: PieceState;
  past: PieceState[];
  future: PieceState[];

  // --- Transient UI State (Not in history) ---
  operation: Operation;
  activeDrawer: string | null;
  busy: string | null;
  status: string;
  chrome: boolean;

  // Tool State
  brushSize: number;
  maskMode: 'draw' | 'erase';

  // Design Parameters (current working values)
  request: string;

  // --- Actions ---

  /**
   * Updates the present state and pushes the previous state to the 'past' stack.
   * Supports both partial state updates and functional updates.
   */
  pushState: (update: Partial<PieceState> | ((prev: PieceState) => Partial<PieceState>)) => void;

  /**
   * Directly updates the present state without creating a history checkpoint.
   * Useful for transient updates (like typing in a text field before blur).
   */
  updatePresent: (update: Partial<PieceState> | ((prev: PieceState) => Partial<PieceState>)) => void;

  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // UI Actions
  setOperation: (op: Operation | ((prev: Operation) => Operation)) => void;
  setActiveDrawer: (drawer: (string | null) | ((prev: string | null) => string | null)) => void;
  setBusy: (busy: (string | null) | ((prev: string | null) => string | null)) => void;
  setStatus: (status: string | ((prev: string) => string)) => void;
  setChrome: (chrome: boolean | ((prev: boolean) => boolean)) => void;
  setBrushSize: (size: number | ((prev: number) => number)) => void;
  setMaskMode: (mode: ('draw' | 'erase') | ((prev: 'draw' | 'erase') => 'draw' | 'erase')) => void;
  setRequest: (request: string | ((prev: string) => string)) => void;

  // Initialize/Reset
  resetStore: (initialPiece: PieceState, past?: PieceState[], future?: PieceState[]) => void;
}

const MAX_HISTORY = 50;

/** Resolves a value-or-updater function against current state. */
function applyUpdate<T>(update: T | ((prev: T) => T), current: T): T {
  return typeof update === 'function' ? (update as (prev: T) => T)(current) : update;
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  // Initial State
  present: {
    referenceImages: [],
    baseImage: null,
    designId: null,
    styleId: null,
    lockArtifacts: null,
    lockedImage: null,
    editLayers: [],
    variants: [],
    stencil: null,
    skinMockup: null,
    activePhase: 'reference',
  } as PieceState,
  past: [],
  future: [],
  operation: 'Extract',
  activeDrawer: null,
  busy: null,
  status: 'Ready',
  chrome: true,
  brushSize: 40,
  maskMode: 'draw',
  request: '',

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  pushState: (update) => {
    const { present, past } = get();
    const updateObj = typeof update === 'function' ? update(present) : update;
    const nextPresent = { ...present, ...updateObj };
    // Cheap identity check on the most-frequently-changing fields.
    // Avoids full deep-serialize on every push (PieceState can be large).
    const noChange =
      nextPresent.baseImage     === present.baseImage     &&
      nextPresent.editLayers    === present.editLayers    &&
      nextPresent.request       === present.request       &&
      nextPresent.lastUpdate    === present.lastUpdate;
    if (noChange) return;
    set({
      past: [...past.slice(-(MAX_HISTORY - 1)), present],
      present: nextPresent,
      future: [],
    });
  },

  updatePresent: (update) => {
    const { present } = get();
    const updateObj = typeof update === 'function' ? update(present) : update;
    set({ present: { ...present, ...updateObj } });
  },

  undo: () => {
    const { past, present, future } = get();
    if (past.length === 0) return false;
    const previous = past[past.length - 1];
    set({ past: past.slice(0, -1), present: previous, future: [present, ...future] });
    return true;
  },

  redo: () => {
    const { past, present, future } = get();
    if (future.length === 0) return false;
    const [next, ...nextFuture] = future;
    set({ past: [...past, present], present: next, future: nextFuture });
    return true;
  },

  setOperation:    (u) => set((s) => ({ operation:    applyUpdate(u, s.operation) })),
  setActiveDrawer: (u) => set((s) => ({ activeDrawer: applyUpdate(u, s.activeDrawer) })),
  setBusy:         (u) => set((s) => ({ busy:         applyUpdate(u, s.busy) })),
  setStatus:       (u) => set((s) => ({ status:       applyUpdate(u, s.status) })),
  setChrome:       (u) => set((s) => ({ chrome:       applyUpdate(u, s.chrome) })),
  setBrushSize:    (u) => set((s) => ({ brushSize:    applyUpdate(u, s.brushSize) })),
  setMaskMode:     (u) => set((s) => ({ maskMode:     applyUpdate(u, s.maskMode) })),
  setRequest:      (u) => set((s) => ({ request:      applyUpdate(u, s.request) })),

  resetStore: (initialPiece, past = [], future = []) => set({
    present: initialPiece,
    past,
    future,
    status: 'Ready',
    request: initialPiece.request || '',
  }),
}));
