'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Loader2, Sparkles, Wand2, Activity, ShieldCheck, Play, Check,
  Layers, ImagePlus, Plus, Mic, MicOff, Maximize2, Maximize, X, History,
  CheckCircle2, Microscope, MessageSquareQuote, Lock, Download, LayoutGrid,
  MoveDiagonal, Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SessionDetailRecord } from '@/lib/server/session-detail';
import { derivePresetId } from '@/lib/ai/generation-profiles';
import { useStudioBootstrap } from './useStudioBootstrap';
import { useStudioVoice } from './voice/use-studio-voice';
import { useCanvasGestures } from '@/hooks/useCanvasGestures';
import { Operation, operationAction } from './studio-sidebar';
import { clientUploadAsset } from '@/lib/client/upload';
import { MaskCanvas } from './shared/mask-canvas';
import { TattooQAReport } from '@/lib/ai/prompt-contracts/tattoo-qa';
import { getSurgicalWarning } from '@/lib/image/surgical-warning';
import { interpretSurgicalInstruction } from '@/lib/ai/surgical-interpreter';
import { SurgicalDeltaOverlay } from './shared/surgical-delta-overlay';
import { useStudioStore } from '@/lib/stores/studio-store';
import type { PieceState, DesignPhase } from '@/types/domain';
// Split modules
import { sanitizePersistedClientState, isRecord, DESIGN_PHASES } from './studio-types';
import { RadialNode, PHASES } from './studio-atoms';
import { StudioCommandDock } from './studio-command-dock';
import {
  PhaseSidebar, LocksDrawer, LayersDrawer, RefsDrawer,
  ReferenceAssistHandle, ReferenceAssistDrawer,
} from './studio-drawers';
import { useStudioActions } from './useStudioActions';

interface StudioClientProps {
  detail?: SessionDetailRecord;
}

export function StudioClient({ detail }: StudioClientProps) {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const canvasGestureRef = useRef<HTMLElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasRotation, setCanvasRotation] = useState(0);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });

  const persistedClientState = useMemo(
    () => sanitizePersistedClientState(detail?.session.client_state),
    [detail?.session.client_state],
  );

  // ── Global store ────────────────────────────────────────────────────────────
  const {
    busy, setBusy, status, setStatus, chrome, setChrome,
    operation, setOperation, activeDrawer, setActiveDrawer,
    present: piece, past: pastPiece, future: futurePiece,
    pushState: pushPiece, updatePresent, undo: undoPiece, redo: redoPiece,
    resetStore, brushSize, setBrushSize, maskMode, setMaskMode, request, setRequest,
  } = useStudioStore();

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showMask, setShowMask] = useState(() => persistedClientState.showMask ?? false);
  const [maskAssetId, setMaskAssetId] = useState<string | null>(() => persistedClientState.maskAssetId ?? null);
  const [regionHint, setRegionHint] = useState<string | null>(() => persistedClientState.regionHint ?? null);
  const [maskType, setMaskType] = useState<'include' | 'exclude'>(() => persistedClientState.maskType ?? 'include');
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(() => persistedClientState.previewAssetId ?? null);
  const [qaReport, setQaReport] = useState<TattooQAReport | null>(null);
  const [dockPosition, setDockPosition] = useState(() => persistedClientState.dockPosition ?? { x: 1400, y: 400 });
  const [dockItems, setDockItems] = useState(() => persistedClientState.dockItems?.length ? persistedClientState.dockItems : ['menu', 'locks', 'refs', 'layers', 'undo', 'redo']);
  const [driftError, setDriftError] = useState<string | null>(null);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const isMounted = useRef(false);
  const lastSavedClientStateRef = useRef<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Piece hydration ─────────────────────────────────────────────────────────
  const initialPiece: PieceState = useMemo(() => {
    const saved = persistedClientState.piece ?? {};
    const referenceImages = detail?.projectReferences?.length
      ? detail.projectReferences.map(a => a.blob_url)
      : detail?.referenceAsset ? [detail.referenceAsset.blob_url] : [];
    return {
      id: detail?.project?.id,
      clientId: detail?.project?.id,
      referenceImages,
      baseImage: detail?.latestApprovedAsset?.blob_url ?? saved.baseImage ?? detail?.referenceAsset?.blob_url ?? null,
      designId: detail?.activeLock?.design_id_lock ?? saved.designId ?? null,
      styleId: detail?.activeLock?.style_id_lock ?? saved.styleId ?? null,
      lockArtifacts: saved.lockArtifacts ?? null,
      lockedImage: detail?.latestApprovedAsset?.blob_url ?? saved.lockedImage ?? detail?.referenceAsset?.blob_url ?? null,
      locksExtracted: !!detail?.activeLock,
      locksActive: !!detail?.activeLock,
      editLayers: Array.isArray(saved.editLayers) ? saved.editLayers : [],
      variants: Array.isArray(saved.variants) ? saved.variants : [],
      stencil: saved.stencil ?? null,
      skinMockup: saved.skinMockup ?? null,
      activePhase: persistedClientState.activePhase ?? saved.activePhase ?? (detail?.activeLock ? 'surgical' : 'reference'),
      request: persistedClientState.request ?? saved.request ?? '',
      activeReferenceIds: Array.isArray(saved.activeReferenceIds) ? saved.activeReferenceIds : [],
      referencePromptParams: isRecord(saved.referencePromptParams) ? saved.referencePromptParams as PieceState['referencePromptParams'] : {},
      maskAssetId: persistedClientState.maskAssetId ?? saved.maskAssetId ?? null,
      regionHint: persistedClientState.regionHint ?? saved.regionHint ?? null,
      maskType: persistedClientState.maskType ?? saved.maskType ?? 'include',
    };
  }, [detail, persistedClientState]);

  useEffect(() => {
    if (!isMounted.current) {
      resetStore(initialPiece, persistedClientState.past as PieceState[] | undefined, persistedClientState.future as PieceState[] | undefined);
      setOperation(persistedClientState.operation ?? (initialPiece.activePhase === 'surgical' ? 'Surgical' : 'Extract'));
      setActiveDrawer(persistedClientState.activeDrawer ?? null);
      setBrushSize(persistedClientState.brushSize ?? 40);
      setMaskMode(persistedClientState.maskMode ?? 'draw');
      isMounted.current = true;
      if (!persistedClientState.dockPosition && typeof window !== 'undefined') {
        setDockPosition({ x: window.innerWidth - 80, y: 400 });
      }
      setStoreHydrated(true);
    } else {
      const current = useStudioStore.getState().present;
      useStudioStore.getState().updatePresent({
        ...initialPiece,
        activePhase: current.activePhase ?? initialPiece.activePhase,
        activeReferenceIds: current.activeReferenceIds,
        referencePromptParams: current.referencePromptParams ?? initialPiece.referencePromptParams,
        request: current.request ?? initialPiece.request,
        maskAssetId: current.maskAssetId ?? initialPiece.maskAssetId,
        maskType: current.maskType ?? initialPiece.maskType,
        regionHint: current.regionHint ?? initialPiece.regionHint,
      });
      setStoreHydrated(true);
    }
  }, [initialPiece, persistedClientState, resetStore, setActiveDrawer, setBrushSize, setMaskMode, setOperation]);

  // Sync piece → local state mirrors
  useEffect(() => {
    if (piece.request !== undefined && piece.request !== request) setRequest(piece.request);
    if (piece.maskAssetId !== undefined && piece.maskAssetId !== maskAssetId) setMaskAssetId(piece.maskAssetId);
    if (piece.maskType !== undefined && piece.maskType !== maskType) setMaskType(piece.maskType);
    if (piece.regionHint !== undefined && piece.regionHint !== regionHint) setRegionHint(piece.regionHint);
  }, [piece]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Workflow gates ──────────────────────────────────────────────────────────
  const gates = useMemo(() => {
    const isBaseSelected = !!piece.baseImage;
    const isLocked = !!piece.locksActive;
    const gated = (open: boolean, key: string, label: string) => ({
      status: open ? 'open' : 'locked',
      unmet: open ? [] : [{ key, label }],
    });
    return {
      reference: { status: 'open', unmet: [] },
      extract:   gated(isBaseSelected, 'base', 'Select a Base Image'),
      surgical:  gated(isLocked, 'extract', 'Extract Design Locks'),
      creative:  gated(isLocked, 'extract', 'Extract Design Locks'),
      variants:  gated(isLocked, 'extract', 'Extract Design Locks'),
      stencil:   gated(isLocked, 'extract', 'Extract Design Locks'),
      mockup:    gated(isLocked, 'extract', 'Extract Design Locks'),
      marketing: gated(isLocked, 'extract', 'Extract Design Locks'),
    };
  }, [piece]);

  const activePhaseId = piece.activePhase || 'reference';
  const setActivePhaseId = (phase: DesignPhase) => {
    if (gates[phase].status === 'open') pushPiece({ ...piece, activePhase: phase });
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const surgicalInfo = useMemo(() => operation === 'Surgical' ? interpretSurgicalInstruction(request) : null, [request, operation]);

  const activeSurgicalWarning = useMemo(() => {
    if (operation !== 'Surgical') return null;
    return getSurgicalWarning({
      maskProvided: !!maskAssetId, maskBBoxExists: !!maskAssetId,
      targetRegion: surgicalInfo?.targetRegion || regionHint,
      driftOutsideMask: driftError?.includes('outside mask'),
      driftOutsideTarget: driftError?.includes('outside target region'),
    });
  }, [operation, maskAssetId, surgicalInfo, regionHint, driftError]);

  const latestEditRun = detail?.editRuns?.[0];
  const isCompletedEditRun = latestEditRun?.status === 'succeeded' || latestEditRun?.status === 'complete';
  const latestOutput = isCompletedEditRun ? latestEditRun?.outputAsset : null;

  const displayAsset = useMemo(() => {
    if (previewAssetId) {
      const ref = detail?.projectReferences?.find(a => a.id === previewAssetId);
      if (ref) return ref;
      const layer = detail?.editRuns?.find(r => r.outputAsset?.id === previewAssetId)?.outputAsset;
      if (layer) return layer;
    }
    return latestOutput ?? detail?.currentBaseAsset ?? detail?.referenceAsset;
  }, [previewAssetId, latestOutput, detail]);

  const activeLocksList = useMemo(() => {
    const locks = detail?.activeLock;
    return [
      { name: 'Design',      value: locks?.design_id_lock !== '[X]' ? locks?.design_id_lock : null },
      { name: 'Style',       value: locks?.style_id_lock !== '[X]' ? locks?.style_id_lock : null },
      { name: 'Context',     value: locks?.context_id_lock !== '[X]' ? locks?.context_id_lock : null },
      { name: 'Camera',      value: locks?.camera_id_lock !== '[X]' ? locks?.camera_id_lock : null },
      { name: 'Composition', value: locks?.composition_id_lock !== '[X]' ? locks?.composition_id_lock : null },
      { name: 'Tattoo',      value: locks?.tattoo_id_lock !== '[X]' ? locks?.tattoo_id_lock : null },
      { name: 'Placement',   value: locks?.placement_id_lock !== '[X]' ? locks?.placement_id_lock : null },
    ];
  }, [detail?.activeLock]);

  const referencePromptLines = useMemo(() => {
    const params = piece.referencePromptParams ?? {};
    return (piece.activeReferenceIds ?? [])
      .map((id, i) => {
        const param = params[id];
        const title = param?.title?.trim() || `Ref${i + 1}`;
        const promptLine = param?.promptLine?.trim();
        return promptLine ? `${title}: ${promptLine}` : null;
      })
      .filter(Boolean) as string[];
  }, [piece.activeReferenceIds, piece.referencePromptParams]);

  const runLabel = useMemo(() => {
    switch (operation) {
      case 'Extract':    return 'Extract Locks';
      case 'Surgical':   return 'Surgical Edit';
      case 'Creative':   return 'Creative Pivot';
      case 'Mockup':     return 'Skin Mockup';
      case 'Variant':    return 'Flash Sheet';
      case 'Stencil':    return 'Stencil Export';
      case 'Turnaround': return 'Model Sheet';
      default: return 'Execute';
    }
  }, [operation]);

  const operationLabel = useMemo(() => {
    switch (operation) {
      case 'Extract':  return 'Extract Locks';
      case 'Surgical': return 'Surgical Edit';
      case 'Creative': return 'Creative Delta';
      case 'Variant':  return 'Variant Sheet';
      case 'Stencil':  return 'Stencil Export';
      case 'Mockup':   return 'Placement Fit';
      default: return 'Studio';
    }
  }, [operation]);

  const isReferenceAssistPhase = activePhaseId === 'surgical' || activePhaseId === 'creative';

  // ── Autosave sync ───────────────────────────────────────────────────────────
  const syncClientState = useMemo(() => ({
    piece: { ...piece, request, maskAssetId, maskType, regionHint },
    operation, activeDrawer, brushSize, maskMode, request,
    maskAssetId, regionHint, maskType, showMask,
    dockPosition, dockItems, previewAssetId,
    activePhase: piece.activePhase,
    past: pastPiece, future: futurePiece,
  }), [piece, pastPiece, futurePiece, request, maskAssetId, maskType, regionHint, operation, activeDrawer, brushSize, maskMode, showMask, dockPosition, dockItems, previewAssetId]);

  useEffect(() => {
    if (!detail?.session.id || !storeHydrated) return;
    const serialized = JSON.stringify(syncClientState);
    if (lastSavedClientStateRef.current === null) { lastSavedClientStateRef.current = serialized; return; }
    if (lastSavedClientStateRef.current === serialized) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      lastSavedClientStateRef.current = serialized;
      fetch(`/api/sessions/${detail.session.id}/sync`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...syncClientState, updatedAt: new Date().toISOString() }),
      }).catch(() => {});
    }, 900);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [detail?.session.id, storeHydrated, syncClientState]);

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  const { bootstrap, batchUpload } = useStudioBootstrap();

  // ── Canvas ──────────────────────────────────────────────────────────────────
  const canvasTransformStyle = useMemo<React.CSSProperties>(() => ({
    transform: `translate(-50%, -50%) translate(${Math.round(canvasPan.x)}px, ${Math.round(canvasPan.y)}px) scale(${canvasScale}) rotate(${canvasRotation}deg)`,
    transformOrigin: 'center center',
    transition: busy ? 'none' : 'transform 0.1s ease-out',
  }), [canvasPan.x, canvasPan.y, canvasScale, canvasRotation, busy]);

  const resetCanvasView = useCallback(() => {
    setCanvasScale(1); setCanvasPan({ x: 0, y: 0 }); setCanvasRotation(0);
    setStatus('Canvas snapped to fit.');
  }, [setStatus]);

  const handleToggleFullscreen = useCallback(() => {
    setChrome(!chrome);
    setActiveDrawer(null);
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setStatus('Full-screen mode enabled.');
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch { /* ignore */ }
  }, [chrome, setChrome, setActiveDrawer, setStatus]);

  const pushCheckpoint = useCallback(() => {
    pushPiece({ ...piece, request, maskAssetId, maskType, regionHint });
  }, [piece, request, maskAssetId, maskType, regionHint, pushPiece]);

  // ── Voice ───────────────────────────────────────────────────────────────────

  // Actions hook — all handlers in one place
  const actions = useStudioActions({
    detail, piece, operation, request, maskAssetId, regionHint, maskType,
    showMask, activePhaseId, gates, displayAsset, referencePromptLines,
    surgicalInfo, uploadInputRef,
    setBusy, setStatus, setOperation, setActiveDrawer, setRequest,
    pushPiece, updatePresent,
    setMessage, setMaskAssetId, setRegionHint, setMaskType, setShowMask,
    setDriftError, setQaReport, setPreviewAssetId,
    bootstrap, batchUpload,
    voiceStatus: 'idle', voiceToggle: () => {},
    busy,
    runLabel, activeLocksList,
  });

  const { status: voiceStatus, toggleListening: voiceToggle } = useStudioVoice({
    onCommand: actions.handleVoiceCommand,
    onTranscript: (text) => setRequest(text),
  });

  useCanvasGestures(
    canvasGestureRef,
    { scale: canvasScale, pan: canvasPan, rotation: canvasRotation },
    {
      onZoom: setCanvasScale, onPan: setCanvasPan, onRotate: setCanvasRotation,
      onToggleFullScreen: handleToggleFullscreen,
      onUndo: () => { if (undoPiece()) { setStatus('Undo executed.'); setMessage({ text: 'Undo', type: 'info' }); } },
      onRedo: () => { if (redoPiece()) { setStatus('Redo executed.'); setMessage({ text: 'Redo', type: 'info' }); } },
      onLongPress: () => setStatus('Color picker gesture received. Eyedropper UI pending.'),
      onDoubleTap: resetCanvasView,
      onFitToScreen: resetCanvasView,
      onCopyPasteMenu: () => { setStatus('Copy/Paste gesture received. Actions panel pending.'); setMessage({ text: 'Copy/Paste menu gesture', type: 'info' }); },
      onClearLayer: () => {
        pushCheckpoint();
        setRequest(''); setMaskAssetId(null); setRegionHint(null); setShowMask(false);
        setStatus('Layer cleared.');
        setMessage({ text: 'Layer Cleared (Scrub)', type: 'info' });
        setTimeout(() => pushPiece({ ...piece, request: '', maskAssetId: null, regionHint: null }), 50);
      },
    },
  );

  // ── Reference workspace ─────────────────────────────────────────────────────
  const renderReferenceWorkspace = () => {
    const refs = detail?.projectReferences?.length
      ? detail.projectReferences
      : detail?.referenceAsset ? [detail.referenceAsset] : [];

    if (refs.length === 0) {
      return (
        <div
          onClick={() => uploadInputRef.current?.click()}
          className="h-full w-full flex flex-col items-center justify-center cursor-pointer group transition-colors hover:bg-white/[0.02]"
        >
          <div className="w-24 h-24 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center mb-8 text-white/5 group-hover:text-tls-amber group-hover:border-tls-amber/20 group-hover:bg-tls-amber/5 transition-all duration-500">
            <Upload size={32} strokeWidth={1} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 group-hover:text-white/40 transition-colors duration-500">
            Drop Inspiration to Start
          </div>
        </div>
      );
    }

    return (
      <div className="h-full w-full p-6 overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-4 gap-4 auto-rows-[200px]">
          {refs.map((asset, i) => {
            const url = asset.blob_url;
            const isWide = (i % 7 === 1 || i % 7 === 5);
            const isTall = (i % 7 === 3);
            const isLarge = (i % 7 === 0);
            return (
              <div
                key={asset.id}
                onClick={() => pushPiece({ baseImage: url })}
                onDoubleClick={async () => {
                  await actions.handleUpdateReference(asset.id);
                  pushPiece({ ...useStudioStore.getState().present, baseImage: url, activePhase: 'extract' });
                  setOperation('Extract');
                  setStatus('Base selected. Entering Locks Extraction.');
                }}
                className={`relative group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-500 hover:scale-[1.02] hover:z-10 ${
                  piece.baseImage === url
                    ? 'border-tls-amber ring-4 ring-tls-amber/20 z-10'
                    : 'border-white/5 grayscale-[0.8] hover:grayscale-0 hover:border-white/20'
                } ${isLarge ? 'col-span-2 row-span-2' : isWide ? 'col-span-2' : isTall ? 'row-span-2' : ''}`}
              >
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 z-20">
                  <span className="text-[10px] font-black text-tls-amber">REF{i + 1}</span>
                </div>
                <img src={url} className="w-full h-full object-cover" alt={`Reference ${i + 1}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">Select Base</span>
                    {piece.baseImage === url && <div className="w-2 h-2 rounded-full bg-tls-amber shadow-[0_0_8px_#fbbf24]" />}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); actions.handleDeleteAsset(asset.id); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/40 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/5 hover:border-white/20 hover:bg-white/[0.02] transition-all group"
          >
            <Plus className="w-8 h-8 text-white/10 group-hover:text-white/40 transition-colors" />
            <span className="mt-4 text-[9px] font-black uppercase tracking-widest text-white/10 group-hover:text-white/40">Add More</span>
          </button>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={`tls-shell ${chrome ? 'tls-shell--chrome' : 'tls-shell--clean'} ${activeDrawer ? 'tls-shell--drawer-open' : ''}`}>
      {chrome && (
        <header className="tls-topbar">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="tls-topbar-icon !bg-transparent !border-0 text-white/40 hover:text-white" title="Go Back">
              <ArrowLeft size={18} />
            </button>
            <span className="tls-topbar-title font-black text-white/92 tracking-[0.14em] uppercase">{operationLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="tls-status-dot" />
            <button
              className="tls-topbar-icon !bg-transparent !border-0 text-white/40 hover:text-white"
              onClick={() => { handleToggleFullscreen(); setChrome(false); setActiveDrawer(null); }}
              title="Full Screen Canvas"
            >
              <Maximize size={16} />
            </button>
          </div>
        </header>
      )}

      <input type="file" ref={uploadInputRef} style={{ display: 'none' }} accept="image/*" multiple onChange={actions.onFileChange} />

      <main
        ref={canvasGestureRef as React.RefObject<HTMLElement>}
        className="tls-artboard-frame"
        style={activePhaseId === 'reference' ? {} : canvasTransformStyle}
      >
        <section className="tls-artboard relative h-full w-full overflow-hidden bg-tls-artboard">
          {busy && (
            <div className="absolute inset-0 z-50 bg-black/48 backdrop-blur-[12px] flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-tls-amber mb-4" />
              <div className="text-tls-amber font-black uppercase tracking-[0.22em] text-[11px]">{busy}...</div>
            </div>
          )}

          {activePhaseId === 'reference' ? (
            renderReferenceWorkspace()
          ) : (
            <div className="relative h-full w-full">
              <ReferenceAssistHandle piece={piece} isReferenceAssistPhase={isReferenceAssistPhase} activeDrawer={activeDrawer} setActiveDrawer={setActiveDrawer} />
              <ReferenceAssistDrawer
                detail={detail} piece={piece} isReferenceAssistPhase={isReferenceAssistPhase}
                activeDrawer={activeDrawer} setActiveDrawer={setActiveDrawer}
                onSelect={actions.handleUpdateReference}
                onAddReference={actions.handleAddReference}
                onParamChange={actions.handleReferencePromptParamChange}
              />

              {regionHint && (
                <div className="tls-artboard-badge z-20 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded bg-tls-amber text-black text-[8px] font-black animate-tls-slide-in">
                    <span>FOCUS: {regionHint.toUpperCase()}</span>
                    <button onClick={() => { setRegionHint(null); setStatus('Target area cleared.'); }} className="hover:scale-110 transition-transform cursor-pointer">
                      <X size={10} />
                    </button>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center">
                {displayAsset?.blob_url ? (
                  <img src={displayAsset.blob_url} className={`w-full h-full object-contain ${operation === 'Mockup' ? '' : 'opacity-90 transition-opacity'}`} alt="Design" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/10 pointer-events-none">
                    <Upload size={32} strokeWidth={1.5} className="mb-4" />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Ready for lock extraction</span>
                  </div>
                )}
              </div>

              {showMask && (
                <MaskCanvas
                  width={displayAsset?.width ?? 2048}
                  height={displayAsset?.height ?? 2048}
                  isActive={showMask}
                  onExport={async (blob) => {
                    if (!blob) { setMaskAssetId(null); return; }
                    if (!detail?.project.id) return;
                    try {
                      const asset = await clientUploadAsset(blob, detail.project.id, 'mask');
                      setMaskAssetId(asset.artifacts.assetId);
                      setStatus('Mask updated.');
                    } catch { setStatus('Mask upload failed.'); }
                  }}
                />
              )}

              {operation === 'Surgical' && (
                <SurgicalDeltaOverlay
                  deltas={piece.surgicalEdits || []}
                  width={displayAsset?.width || 2048}
                  height={displayAsset?.height || 2048}
                  isVisible={true}
                />
              )}

              {operation === 'Surgical' && (surgicalInfo?.displayRegion || activeSurgicalWarning) && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
                  {surgicalInfo?.displayRegion && !activeSurgicalWarning && (
                    <div className="px-3 py-1 bg-tls-amber/20 backdrop-blur-md border border-tls-amber/30 rounded-full text-[10px] font-black text-tls-amber uppercase tracking-widest animate-tls-slide-down">
                      Target: {surgicalInfo.displayRegion}
                    </div>
                  )}
                  {activeSurgicalWarning && (
                    <div className="px-4 py-2 bg-red-950/80 backdrop-blur-xl border border-red-500/40 rounded-xl text-[11px] font-bold text-red-200 shadow-tls-heavy animate-tls-pulse text-center max-w-[280px]">
                      {activeSurgicalWarning}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <StudioCommandDock
        activeDrawer={activeDrawer} setActiveDrawer={setActiveDrawer}
        activePhase={activePhaseId} runPhaseAction={actions.handleRun}
        chrome={chrome} setChrome={setChrome}
        setShowQuickMenu={setShowQuickMenu}
        dockPosition={dockPosition} setDockPosition={setDockPosition}
        dockItems={dockItems} setDockItems={setDockItems}
        onRunAudit={actions.handleGetCritique}
        onOpenExport={() => setShowExportMenu(true)}
        onRelock={actions.handleRelock}
        onToggleMask={() => setShowMask(!showMask)}
      />

      {chrome && (
        <>
          <PhaseSidebar
            activePhaseId={activePhaseId}
            gates={gates}
            onSelect={(phase, op) => { setActivePhaseId(phase); setOperation(op as Operation); }}
          />
          {activeDrawer === 'locks' && (
            <LocksDrawer activeLocksList={activeLocksList} activePhaseId={activePhaseId} operation={operation} busy={busy} runLabel={runLabel} onRun={actions.handleRun} />
          )}
          {activeDrawer === 'layers' && (
            <LayersDrawer detail={detail} previewAssetId={previewAssetId} setPreviewAssetId={setPreviewAssetId} onPromote={actions.handlePromoteToReference} />
          )}
          {activeDrawer === 'refs' && (
            <RefsDrawer detail={detail} piece={piece} activePhaseId={activePhaseId} onSelect={actions.handleUpdateReference} onAddReference={actions.handleAddReference} />
          )}

          <section className="tls-command">
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-tls-muted text-[10px] font-black tracking-[0.2em] uppercase">
                    <span className="text-tls-amber">✦</span>
                    <span>Artist Instruction</span>
                  </div>
                  {(piece.activeReferenceIds?.length || 0) > 0 && (
                    <div className="flex items-center gap-1 animate-tls-slide-in">
                      <div className="h-4 w-px bg-white/10 mx-1" />
                      {piece.activeReferenceIds?.map((id, i) => {
                        const ref = detail?.projectReferences?.find(r => r.id === id);
                        const refTitle = piece.referencePromptParams?.[id]?.title?.trim() || `REF ${i + 1}`;
                        return (
                          <div key={id} className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-tls-amber/10 border border-tls-amber/20">
                            <div className="w-3.5 h-3.5 rounded bg-black overflow-hidden border border-tls-amber/30">
                              {ref?.blob_url && <img src={ref.blob_url} className="w-full h-full object-cover" alt="" />}
                            </div>
                            <span className="text-[9px] font-black text-tls-amber">{refTitle}</span>
                            <button onClick={() => actions.handleUpdateReference(id)} className="text-tls-amber/40 hover:text-tls-amber transition-colors bg-transparent border-0 p-0 cursor-pointer">
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {activePhaseId === 'extract' && <div className="tls-readonly-pill">Read Only Phase</div>}
              </div>
              <div className="flex w-full gap-2 bg-white/[0.04] rounded-xl border border-white/[0.06] p-1 pr-1.5">
                <input
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder="Describe edit..."
                  disabled={!!busy}
                  onKeyDown={(e) => e.key === 'Enter' && actions.handleRun()}
                  className="tls-command-input px-3"
                />
                <button onClick={actions.handleMicToggle} className={`h-8 w-8 grid place-items-center rounded-lg cursor-pointer transition-colors ${voiceStatus === 'listening' ? 'bg-tls-amber/20 text-tls-amber' : 'text-white/40 hover:bg-white/10'}`}>
                  {voiceStatus === 'listening' ? <Mic size={14} /> : <MicOff size={14} />}
                </button>
                <button
                  onClick={actions.handleEnhancePrompt}
                  disabled={!!busy || !request.trim()}
                  className="h-8 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 text-[9px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
                >
                  <Sparkles size={12} />
                  <span>Refine</span>
                </button>
              </div>
            </div>
            <button
              onClick={actions.handleRun}
              disabled={!!busy || (!request.trim() && ['Surgical', 'Creative'].includes(operation))}
              className="tls-run-btn"
            >
              <Activity size={14} />
              <span>{runLabel}</span>
            </button>
          </section>

          {qaReport && (
            <div className="absolute top-[100px] left-1/2 -translate-x-1/2 w-[min(500px,80vw)] bg-tls-panel-heavy border border-tls-border backdrop-blur-tls-32 rounded-tls-20 p-[18px] z-[120] text-white text-[13px] leading-[1.5] border-l-4 border-l-tls-amber animate-tls-slide-down shadow-tls-heavy">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-tls-amber font-black uppercase tracking-widest text-[10px]">
                  <MessageSquareQuote size={14} />
                  <span>Drift Detection • {qaReport.score}% Match</span>
                </div>
                <button onClick={() => setQaReport(null)} className="text-white/20 hover:text-white transition-colors bg-transparent border-0 cursor-pointer">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-white/90">{qaReport.summary}</p>
                {(qaReport?.findings?.length || 0) > 0 && (
                  <ul className="space-y-1 pl-1">
                    {qaReport?.findings?.map((finding: string, i: number) => (
                      <li key={i} className="text-white/60 flex gap-2">
                        <span className="text-tls-amber">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showQuickMenu && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/64 backdrop-blur-sm" onClick={() => setShowQuickMenu(false)} />
          <div className="relative w-[320px] h-[320px] animate-in zoom-in duration-300">
            <div onClick={() => setShowQuickMenu(false)} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20 bg-black/80 backdrop-blur-xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all shadow-2xl z-10">
              <X size={20} className="text-white/40" />
            </div>
            <RadialNode label="Run Delta"   icon={<Play size={14}/>}       angle={-90}  radius={110} primary onClick={() => { actions.handleRun(); setShowQuickMenu(false); }} />
            <RadialNode label="Locks"       icon={<Lock size={14}/>}       angle={-30}  radius={110} onClick={() => { setActiveDrawer('locks'); setShowQuickMenu(false); }} />
            <RadialNode label="Deltas"      icon={<Layers size={14}/>}     angle={30}   radius={110} onClick={() => { setActiveDrawer('layers'); setShowQuickMenu(false); }} />
            <RadialNode label="References"  icon={<LayoutGrid size={14}/>} angle={90}   radius={110} onClick={() => { setActiveDrawer('refs'); setShowQuickMenu(false); }} />
            <RadialNode label="Export"      icon={<Download size={14}/>}   angle={150}  radius={110} onClick={() => { setShowExportMenu(true); setShowQuickMenu(false); }} />
            <RadialNode label="Audit"       icon={<Check size={14}/>}      angle={210}  radius={110} onClick={() => { actions.handleGetCritique(); setShowQuickMenu(false); }} />
          </div>
        </div>
      )}

      {!chrome && (
        <button
          onClick={() => setChrome(true)}
          className="absolute top-4 right-4 z-[130] grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/55 text-white/70 shadow-2xl backdrop-blur-2xl transition hover:bg-white hover:text-black"
          title="Show UI"
        >
          <Maximize2 size={20} />
        </button>
      )}

      {showExportMenu && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/84 backdrop-blur-xl" onClick={() => setShowExportMenu(false)} />
          <div className="relative w-[min(480px,90vw)] bg-tls-panel-heavy border border-white/10 rounded-3xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-tls-amber mb-1">Export Engine</h3>
                <h2 className="text-2xl font-semibold">Save Artwork</h2>
              </div>
              <button onClick={() => setShowExportMenu(false)} className="h-10 w-10 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Download to Device</div>
                <div className="grid grid-cols-4 gap-2">
                  {['png', 'jpeg', 'psd', 'pdf'].map(fmt => (
                    <button key={fmt} onClick={() => { actions.handleSaveToDevice(fmt); setShowExportMenu(false); }} className="h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center gap-1 hover:bg-white hover:text-black transition-all group">
                      <Download size={16} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase">{fmt}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Studio Cloud</div>
                <button onClick={() => { setMessage({ text: 'Saved to Cloud Storage', type: 'info' }); setShowExportMenu(false); }} className="w-full h-16 rounded-2xl bg-tls-amber/10 border border-tls-amber/20 flex items-center gap-4 px-4 hover:bg-tls-amber hover:text-black transition-all group">
                  <Activity size={20} />
                  <div className="text-left">
                    <div className="text-[11px] font-black uppercase tracking-widest">Persist Session</div>
                    <div className="text-[9px] opacity-60">Sync all metadata</div>
                  </div>
                </button>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Pipeline</div>
                <button onClick={() => { if (displayAsset) actions.handlePromoteToReference(displayAsset.id); setShowExportMenu(false); }} className="w-full h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-4 px-4 hover:bg-white hover:text-black transition-all group">
                  <LayoutGrid size={20} />
                  <div className="text-left">
                    <div className="text-[11px] font-black uppercase tracking-widest">To Board</div>
                    <div className="text-[9px] opacity-60">New Ref Source</div>
                  </div>
                </button>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5">
              <button onClick={() => { setMessage({ text: 'Checkpoint Created', type: 'info' }); setShowExportMenu(false); }} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all">
                Create Restore Checkpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className="absolute top-24 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 rounded-[16px] border border-tls-amber/30 bg-black/72 backdrop-blur-[12px] text-tls-amber px-[22px] py-[14px] text-[11px] font-black uppercase tracking-[0.22em] shadow-[0_18px_50px_rgba(0,0,0,0.45)] cursor-pointer"
          onClick={() => setMessage(null)}
        >
          {message.type === 'error' ? <ShieldCheck size={16} className="text-red-400" /> : <Sparkles size={16} className="animate-pulse text-tls-amber" />}
          {message.text}
        </div>
      )}
    </div>
  );
}
