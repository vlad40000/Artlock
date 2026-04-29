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

    // Avoid redundant snapshots
    if (JSON.stringify(nextPresent) === JSON.stringify(present)) return;

    set({
      past: [...past.slice(-(MAX_HISTORY - 1)), present],
      present: nextPresent,
      future: [], // Clear redo stack on new action
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
    const nextPast = past.slice(0, past.length - 1);

    set({
      past: nextPast,
      present: previous,
      future: [present, ...future],
    });
    return true;
  },

  redo: () => {
    const { past, present, future } = get();
    if (future.length === 0) return false;

    const next = future[0];
    const nextFuture = future.slice(1);

    set({
      past: [...past, present],
      present: next,
      future: nextFuture,
    });
    return true;
  },

  setOperation: (update) => set((state) => ({ 
    operation: typeof update === 'function' ? (update as any)(state.operation) : update 
  })),
  setActiveDrawer: (update) => set((state) => ({ 
    activeDrawer: typeof update === 'function' ? (update as any)(state.activeDrawer) : update 
  })),
  setBusy: (update) => set((state) => ({ 
    busy: typeof update === 'function' ? (update as any)(state.busy) : update 
  })),
  setStatus: (update) => set((state) => ({ 
    status: typeof update === 'function' ? (update as any)(state.status) : update 
  })),
  setChrome: (update) => set((state) => ({ 
    chrome: typeof update === 'function' ? (update as any)(state.chrome) : update 
  })),
  setBrushSize: (update) => set((state) => ({ 
    brushSize: typeof update === 'function' ? (update as any)(state.brushSize) : update 
  })),
  setMaskMode: (update) => set((state) => ({ 
    maskMode: typeof update === 'function' ? (update as any)(state.maskMode) : update 
  })),
  setRequest: (update) => set((state) => ({ 
    request: typeof update === 'function' ? (update as any)(state.request) : update 
  })),

  resetStore: (initialPiece, past = [], future = []) => set({
    present: initialPiece,
    past,
    future,
    status: 'Ready',
    request: initialPiece.request || '',
  }),
}));
