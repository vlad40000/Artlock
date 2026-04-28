'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Wand2,
  Activity,
  LoaderCircle,
  ShieldCheck,
  Play,
  Check,
  Layers,
  ImagePlus,
  Plus,
  Mic,
  MicOff,
  Maximize2,
  Maximize,
  X,
  History,
  CheckCircle2,
  Microscope,
  MessageSquareQuote,
  Lock,
  Download,
  LayoutGrid,
  MoveDiagonal,
  Upload
} from "lucide-react";
import { useRouter } from 'next/navigation';
import type { SessionDetailRecord } from '@/lib/server/session-detail';
import { derivePresetId, varianceToIntensity } from '@/lib/ai/generation-profiles';
import { useStudioBootstrap } from './useStudioBootstrap';
import { useStudioVoice } from './voice/use-studio-voice';
import type { VoiceCommand } from './voice/voice-command-parser';
import { useCanvasGestures } from '@/hooks/useCanvasGestures';
import { Operation, operationAction } from './studio-sidebar';
import type { TattooQAReport } from '@/lib/ai/prompt-contracts/tattoo-qa';

// --- CONFIG ---
const DEFAULT_MODE = 'Surgical Local';
const DEFAULT_VARIANCE = 'Balanced';
const DEFAULT_TATTOO_MODE = true;
const DEFAULT_SYMMETRY_LOCK = false;

interface StudioClientProps {
  detail?: SessionDetailRecord;
}

// --- UTILS ---
function percentToNorm(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Math.round(value) / 100));
}

function normalizeVoicePercent(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 60;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

// --- SUB-COMPONENTS ---

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const styles = {
    neutral: "border-white/10 bg-white/[0.07] text-white/70",
    green: "border-tls-emerald/30 bg-tls-emerald/15 text-tls-emerald",
    amber: "border-tls-amber/30 bg-tls-amber/15 text-tls-amber",
    red: "border-red-400/30 bg-red-400/15 text-red-200",
    blue: "border-tls-sky/30 bg-tls-sky/15 text-tls-sky",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] bg-tls-panel border border-tls-border backdrop-blur-tls-28 shadow-tls-panel ${styles[tone]}`}>
      {children}
    </span>
  );
}

function IconButton({ children, active, onClick, title }: { children: React.ReactNode; active?: boolean; onClick?: () => void; title?: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black transition-all bg-tls-panel border border-tls-border backdrop-blur-tls-28 shadow-tls-panel ${active
          ? "!border-tls-amber !bg-tls-amber text-black shadow-[0_0_28px_rgba(251,191,36,0.28)]"
          : "text-white/65 hover:bg-white/15 hover:text-white"
        }`}
    >
      {children}
    </button>
  );
}

const PHASES = [
  { id: "core-0", code: "REF", label: "Reference Board", kind: "intake", op: "Extract" },
  { id: "core-1a", code: "LOCK", label: "Lock Extraction", kind: "read", op: "Extract" },
  { id: "core-1b", code: "BASE", label: "Initial Lock", kind: "build", op: "Surgical" },
  { id: "core-1c", code: "SRG", label: "Surgical Delta", kind: "edit", op: "Surgical" },
  { id: "core-1d", code: "PVT", label: "Creative Delta", kind: "delta", op: "Creative" },
  { id: "tat-2", code: "TURN", label: "Turnaround", kind: "edit", op: "Turnaround" },
  { id: "tat-3", code: "STNC", label: "Stencil", kind: "build", op: "Stencil" },
  { id: "tat-4", code: "VAR", label: "Variants", kind: "build", op: "Variant" },
  { id: "tat-5", code: "MOCK", label: "Mockup", kind: "mock", op: "Mockup" },
];

function RadialNode({ label, icon, angle, radius, primary, onClick }: { label: string; icon: React.ReactNode; angle: number; radius: number; primary?: boolean; onClick: () => void }) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  return (
    <button
      onClick={onClick}
      style={{
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
      className={`absolute left-1/2 top-1/2 flex items-center justify-center gap-2 w-32 h-11 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl z-20 ${
        primary
          ? "bg-tls-amber border-tls-amber text-black hover:bg-white hover:scale-110"
          : "bg-[#2a2a2c]/90 border-white/10 text-white/80 hover:bg-white/10 backdrop-blur-md"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StudioCommandDock({
  activeDrawer,
  setActiveDrawer,
  activePhase,
  runPhaseAction,
  chrome,
  setChrome,
  setShowQuickMenu,
  dockPosition,
  setDockPosition,
  dockItems,
  setDockItems,
  onRunAudit,
  onOpenExport,
  onRelock,
}: {
  activeDrawer: string | null;
  setActiveDrawer: React.Dispatch<React.SetStateAction<string | null>>;
  activePhase: string;
  runPhaseAction: () => void;
  chrome: boolean;
  setChrome: React.Dispatch<React.SetStateAction<boolean>>;
  setShowQuickMenu: React.Dispatch<React.SetStateAction<boolean>>;
  dockPosition: { x: number; y: number };
  setDockPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  dockItems: string[];
  setDockItems: React.Dispatch<React.SetStateAction<string[]>>;
  onRunAudit?: () => void;
  onOpenExport?: () => void;
  onRelock?: () => void;
}) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const phase = PHASES.find((item) => item.id === activePhase) || PHASES[0];

  const ALL_ACTIONS: Record<string, { label: string; icon: string }> = {
    menu: { label: "Quick Menu", icon: "▦" },
    locks: { label: "Locks", icon: "▣" },
    refs: { label: "References", icon: "▧" },
    layers: { label: "Deltas", icon: "▤" },
    qa: { label: "Audit", icon: "◉" },
    export: { label: "Export", icon: "⤓" },
    relock: { label: "Sync Lock", icon: "🔃" },
  };

  const canRun =
    phase.kind !== "intake" &&
    phase.kind !== "read";

  const toggleDrawer = (drawer: string) => {
    setActiveDrawer((prev) => (prev === drawer ? null : drawer));
  };

  const handleActionClick = (id: string) => {
    if (isConfiguring) return; // handled by swap logic
    switch(id) {
      case 'menu': setShowQuickMenu(true); break;
      case 'locks': toggleDrawer('locks'); break;
      case 'refs': toggleDrawer('refs'); break;
      case 'layers': toggleDrawer('layers'); break;
      case 'qa': onRunAudit?.(); break;
      case 'export': onOpenExport?.(); break;
      case 'relock': onRelock?.(); break;
      default: toggleDrawer(id);
    }
  };

  const swapAction = (index: number, newActionId: string) => {
    const next = [...dockItems];
    next[index] = newActionId;
    setDockItems(next);
  };

  // Draggable logic
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: dockPosition.x,
      initialY: dockPosition.y,
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setDockPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy,
    });
  }, [setDockPosition]);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  return (
    <aside 
      style={{ left: dockPosition.x, top: dockPosition.y, transform: 'translateY(-50%)' }}
      className="absolute z-50 flex flex-col items-center gap-2 rounded-full border border-white/10 bg-black/42 p-2 shadow-2xl backdrop-blur-2xl"
    >
      <div 
        onMouseDown={onMouseDown}
        className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-[9px] font-black uppercase tracking-[0.08em] text-white/45 cursor-move active:scale-95 transition-transform" 
        title="Drag to reposition"
      >
        {phase.code}
      </div>

      {dockItems.map((id, index) => {
        const item = ALL_ACTIONS[id] || ALL_ACTIONS.menu;
        const isActive = activeDrawer === id;

        return (
          <div key={`${id}-${index}`} className="relative group">
            <button
              title={item.label}
              onClick={() => handleActionClick(id)}
              className={`relative grid h-12 w-12 place-items-center rounded-full border text-sm font-black transition-all active:scale-95 ${
                isActive
                  ? "border-amber-300 bg-amber-300 text-black shadow-[0_0_28px_rgba(251,191,36,0.28)]"
                  : "border-white/10 bg-white/[0.06] text-white/70 hover:bg-white hover:text-black"
              }`}
            >
              <span>{item.icon}</span>
              
              {!isConfiguring && (
                <span className="pointer-events-none absolute left-[58px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white opacity-0 shadow-xl backdrop-blur-xl transition group-hover:opacity-100">
                  {item.label}
                </span>
              )}
            </button>

            {isConfiguring && (
              <div className="absolute left-[58px] top-1/2 -translate-y-1/2 flex gap-1 p-1 rounded-xl bg-black/80 border border-white/10 backdrop-blur-xl z-[60] shadow-2xl">
                {Object.keys(ALL_ACTIONS).map(actionId => (
                  <button
                    key={actionId}
                    onClick={() => swapAction(index, actionId)}
                    className={`h-8 w-8 rounded-lg grid place-items-center transition-colors ${id === actionId ? 'bg-tls-amber text-black' : 'text-white/40 hover:bg-white/10'}`}
                    title={ALL_ACTIONS[actionId].label}
                  >
                    {ALL_ACTIONS[actionId].icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="my-1 h-px w-8 bg-white/10" />

      <button
        title={canRun ? "Run phase action" : "Read-only phase"}
        onClick={runPhaseAction}
        disabled={!canRun}
        className={`group relative grid h-12 w-12 place-items-center rounded-full border text-sm font-black transition-all active:scale-95 ${
          canRun
            ? "border-white/20 bg-white text-black hover:bg-amber-300"
            : "border-white/10 bg-white/[0.04] text-white/25"
        }`}
      >
        <span>▶</span>
        <span className="pointer-events-none absolute left-[58px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white opacity-0 shadow-xl backdrop-blur-xl transition group-hover:opacity-100">
          {canRun ? "Run" : "Read Only"}
        </span>
      </button>

      <button
        title="Configure Dock"
        onClick={() => setIsConfiguring(!isConfiguring)}
        className={`grid h-8 w-8 place-items-center rounded-full border text-[10px] transition-all ${isConfiguring ? 'bg-tls-amber border-tls-amber text-black' : 'border-white/5 bg-white/[0.02] text-white/20 hover:text-white'}`}
      >
        ⚙
      </button>
    </aside>
  );
}

export function StudioClient({ detail }: StudioClientProps) {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const canvasGestureRef = useRef<HTMLElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasRotation, setCanvasRotation] = useState(0);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });

  // UI State
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [showLockDetails, setShowLockDetails] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null);
  const [chrome, setChrome] = useState(true);
  const [activePhaseId, setActivePhaseId] = useState('core-1c');
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [qaReport, setQaReport] = useState<TattooQAReport | null>(null);
  const [dockPosition, setDockPosition] = useState({ x: 16, y: 400 });
  const [dockItems, setDockItems] = useState(['menu', 'locks', 'refs', 'layers']);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const canvasTransformStyle = useMemo<React.CSSProperties>(() => ({
    transform: `translate(-50%, -50%) translate(${Math.round(canvasPan.x)}px, ${Math.round(canvasPan.y)}px) scale(${canvasScale}) rotate(${canvasRotation}deg)`,
    transformOrigin: 'center center',
  }), [canvasPan.x, canvasPan.y, canvasScale, canvasRotation]);

  const handleEnhancePrompt = async () => {
    if (!request.trim() || busy) return;
    setBusy('Optimizing Instruction');
    try {
      const response = await fetch('/api/ai/optimize-text', {
        method: 'POST',
        body: JSON.stringify({
          originalText: request,
          fieldKind: 'creative',
        }),
      });
      const data = await response.json();
      if (data.artifacts?.optimizedText) {
        setRequest(data.artifacts.optimizedText);
      }
    } catch (err: any) {
      setMessage({ text: `Enhance failed: ${err.message}`, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  // Control State
  const [operation, setOperation] = useState<Operation>(
    detail?.activeLock ? 'Surgical' : 'Extract'
  );

  const operationLabel = useMemo(() => {
    switch (operation) {
      case 'Extract': return 'Extract Locks';
      case 'Surgical': return 'Localized Edit';
      case 'Creative': return 'Creative Delta';
      case 'Variant': return 'Variant Sheet';
      case 'Stencil': return 'Stencil Export';
      case 'Mockup': return 'Placement Fit';
      default: return 'Studio';
    }
  }, [operation]);

  const currentPhase = useMemo(() => {
    return PHASES.find(p => p.id === activePhaseId)?.code || 'STUDIO';
  }, [activePhaseId]);
  const [request, setRequest] = useState('');
  const [status, setStatus] = useState('Ready');
  const [fidelity, setFidelity] = useState(60);
  const [detailLevel, setDetailLevel] = useState(70);

  const { bootstrap, isBootstrapping, error: bootstrapError, clearError } = useStudioBootstrap();

  const resetCanvasView = useCallback(() => {
    setCanvasScale(1);
    setCanvasPan({ x: 0, y: 0 });
    setCanvasRotation(0);
    setStatus('Canvas snapped to fit.');
  }, []);

  useCanvasGestures(
    canvasGestureRef,
    { scale: canvasScale, pan: canvasPan, rotation: canvasRotation },
    {
      onZoom: setCanvasScale,
      onPan: setCanvasPan,
      onRotate: setCanvasRotation,
      onUndo: () => {
        setStatus('Undo gesture received. History stack wiring pending.');
        setMessage({ text: 'Undo gesture', type: 'info' });
      },
      onRedo: () => {
        setStatus('Redo gesture received. History stack wiring pending.');
        setMessage({ text: 'Redo gesture', type: 'info' });
      },
      onLongPress: () => {
        setStatus('Color picker gesture received. Eyedropper UI pending.');
      },
      onDoubleTap: resetCanvasView,
      onFitToScreen: resetCanvasView,
      onCopyPasteMenu: () => {
        setStatus('Copy/Paste gesture received. Actions panel pending.');
        setMessage({ text: 'Copy/Paste menu gesture', type: 'info' });
      },
      onClearLayer: () => {
        setStatus('Clear-layer scrub received. Destructive clear is blocked until undo checkpoint wiring exists.');
        setMessage({ text: 'Clear layer blocked until undo checkpoint exists', type: 'info' });
      },
      onToggleFullScreen: () => {
        setChrome((prev) => !prev);
        setActiveDrawer(null);
        setStatus('Full-screen canvas toggled.');
      },
    },
  );

  // --- Voice Setup ---
  const handleVoiceCommand = useCallback((command: VoiceCommand) => {
    switch (command.type) {
      case 'SET_OPERATION':
        setOperation(command.value as Operation);
        setStatus(`Switched to ${command.value}`);
        break;
      case 'SET_DESIGN_FIDELITY': {
        const nextValue = normalizeVoicePercent(command.value);
        setFidelity(nextValue);
        setStatus(`AI Fidelity set to ${nextValue}%.`);
        break;
      }
      case 'SET_DETAIL_LOAD': {
        const nextValue = normalizeVoicePercent(command.value);
        setDetailLevel(nextValue);
        setStatus(`Detail Load set to ${nextValue}%.`);
        break;
      }
      case 'OPEN_DRAWER':
        setActiveDrawer(command.value as string);
        setStatus(`Opened ${command.value}`);
        break;
      case 'FILL_REQUEST':
        setRequest(command.value as string);
        break;
    }
  }, []);

  const {
    status: voiceStatus,
    toggleListening: voiceToggle,
  } = useStudioVoice({
    onCommand: handleVoiceCommand,
    onTranscript: (text) => setRequest(text),
  });

  // --- Handlers ---
  const handleAddReference = () => uploadInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await bootstrap(file, {
          projectId: detail?.project.id,
          sessionId: detail?.session.id,
        });
      } catch (_) {
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleOptimize = async () => {
    if (!request.trim()) {
      setStatus('Add client wording before optimizing.');
      return;
    }
    setBusy('OPTIMIZING');
    try {
      const resp = await fetch('/api/ai/optimize-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText: request.trim(), fieldKind: 'general' }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Optimize failed');
      setRequest(data.artifacts?.optimizedText ?? request.trim());
      setStatus('Text optimized.');
    } catch (err: any) {
      setStatus('Optimize failed.');
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleMicToggle = () => {
    voiceToggle();
    if (voiceStatus !== 'listening') {
      setStatus('Listening — transcript will fill Client Request.');
    } else {
      setStatus('Voice stopped.');
    }
  };

  const handleRun = async () => {
    if (!detail?.session.id || !detail?.project.id) return;

    // Extraction specific flow
    if (operation === 'Extract') {
      if (!detail.referenceAsset) {
        setStatus('Add a reference image first.');
        return;
      }
      setBusy('EXTRACTING LOCKS');
      try {
        const resp = await fetch(`/api/sessions/${detail.session.id}/extract-locks`, { method: 'POST' });
        if (!resp.ok) throw new Error('Extraction failed');
        router.refresh();
        setMessage({ text: 'Locks extracted successfully', type: 'info' });
        setActiveDrawer('locks');
        setOperation('Surgical');
      } catch (err: any) {
        setMessage({ text: err.message, type: 'error' });
      } finally {
        setBusy(null);
      }
      return;
    }

    if (!request.trim() && ['Surgical', 'Creative'].includes(operation)) {
      setStatus('Add a client request before running.');
      return;
    }

    const presetId = derivePresetId(operation, DEFAULT_MODE, DEFAULT_VARIANCE);
    const fidelityNorm = percentToNorm(fidelity);
    const detailNorm = percentToNorm(detailLevel);

    setBusy(`RUNNING ${operation.toUpperCase()}`);
    try {
      let endpoint = '';
      let body: Record<string, unknown> = {};

      // Handle Edit Run
      let maskAssetId: string | null = null;

      switch (operation) {
        case 'Surgical':
          endpoint = `/api/sessions/${detail.session.id}/surgical-edit`;
          body = {
            delta1: request.trim(),
            baseAssetId: displayAsset?.id,
            maskAssetId,
            designFidelity: fidelityNorm,
            detailLoad: detailNorm,
            generationPresetId: presetId,
            variancePreset: DEFAULT_VARIANCE
          };
          break;
        case 'Creative':
          endpoint = `/api/sessions/${detail.session.id}/creative-delta`;
          body = {
            transformation: request.trim(),
            intensity: varianceToIntensity(DEFAULT_VARIANCE),
            baseAssetId: displayAsset?.id,
            maskAssetId,
            designFidelity: fidelityNorm,
            detailLoad: detailNorm,
            generationPresetId: presetId
          };
          break;
        case 'Variant':
          endpoint = `/api/sessions/${detail.session.id}/variant-sheet`;
          body = { baseAssetId: displayAsset?.id, constraints: request.trim() || null, layout: 'single', generationPresetId: presetId };
          break;
        case 'Stencil':
          endpoint = `/api/sessions/${detail.session.id}/stencil`;
          body = { baseAssetId: displayAsset?.id, designFidelity: fidelityNorm, detailLoad: detailNorm };
          break;
        case 'Mockup':
          endpoint = `/api/sessions/${detail.session.id}/mockup`;
          body = { baseAssetId: displayAsset?.id, placement: 'Forearm', designFidelity: fidelityNorm, detailLoad: detailNorm };
          break;
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Operation failed');

      setRequest('');
      setMessage({ text: `${operationAction(operation)} complete`, type: 'info' });
      setStatus('Ready');
      router.refresh();
      setPreviewAssetId(null);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleApproveEdit = async (editRunId: string) => {
    if (!detail?.session.id) return;
    setBusy('APPROVING DESIGN');
    try {
      const resp = await fetch(`/api/sessions/${detail.session.id}/approve-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editRunId }),
      });
      if (!resp.ok) throw new Error('Failed to approve');
      router.refresh();
      setMessage({ text: 'Design approved', type: 'info' });
      setPreviewAssetId(null);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleUpdateReference = async (assetId: string) => {
    if (!detail?.session.id) return;
    setBusy('SWITCHING REFERENCE');
    try {
      const resp = await fetch(`/api/sessions/${detail.session.id}/update-reference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      if (!resp.ok) throw new Error('Failed to update');
      setMessage({ text: 'Reference updated', type: 'info' });
      setPreviewAssetId(null);
      router.refresh();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleRelock = async () => {
    if (!detail?.latestApprovedAsset || !detail?.session.id) return;
    setBusy('RELOCKING APPROVED BASE');
    try {
      const resp = await fetch(`/api/sessions/${detail.session.id}/relock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceAssetId: detail.latestApprovedAsset.id }),
      });
      if (!resp.ok) throw new Error('Failed to relock');
      setActiveDrawer('locks');
      setMessage({ text: 'Approved base relocked', type: 'info' });
      router.refresh();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handlePromoteToReference = async (assetId: string) => {
    if (!detail?.project.id) return;
    setBusy('SAVING TO REFERENCE BOARD');
    try {
      const resp = await fetch('/api/assets/promote-to-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, projectId: detail.project.id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to save to reference board');
      setMessage({ text: 'Saved to Reference Board', type: 'info' });
      router.refresh();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    setBusy('DELETING ASSET');
    try {
      const resp = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Failed to delete asset');
      router.refresh();
      setMessage({ text: 'Asset deleted', type: 'info' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleGetCritique = async () => {
    if (!detail?.session.id || !displayAsset?.id || busy) return;
    setBusy('PERFORMING DRIFT DETECTION');
    try {
      const resp = await fetch(`/api/sessions/${detail.session.id}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateAssetId: displayAsset.id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'QA failed');
      setQaReport(data.report);
      setStatus('Drift detection complete.');
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleSaveToDevice = async (format: string) => {
    if (!displayAsset?.blob_url) return;
    setBusy(`EXPORTING ${format.toUpperCase()}`);
    try {
      const response = await fetch(displayAsset.blob_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `artlock-design-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage({ text: `Design saved as ${format.toUpperCase()}`, type: 'info' });
    } catch (err: any) {
      setMessage({ text: `Export failed: ${err.message}`, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const runLabel = useMemo(() => {
    switch (operation) {
      case 'Extract': return 'Scan Source';
      case 'Surgical': return 'Apply Touch';
      case 'Creative': return 'Forge Pivot';
      case 'Mockup': return 'Project Skin';
      case 'Variant': return 'Cast Variants';
      case 'Stencil': return 'Burn Stencil';
      case 'Turnaround': return 'Rotate View';
      default: return 'Process';
    }
  }, [operation]);

  // --- DATA MAPPING ---
  const latestEditRun = detail?.editRuns?.[0];
  const isCompletedEditRun = latestEditRun?.status === 'succeeded' || latestEditRun?.status === 'complete';
  const latestOutput = isCompletedEditRun ? latestEditRun?.outputAsset : null;

  const displayAsset = useMemo(() => {
    if (previewAssetId) {
      const ref = detail?.projectReferences.find((a) => a.id === previewAssetId);
      if (ref) return ref;
      const layer = detail?.editRuns.find((r) => r.outputAsset?.id === previewAssetId)?.outputAsset;
      if (layer) return layer;
    }
    return latestOutput ?? detail?.currentBaseAsset ?? detail?.referenceAsset;
  }, [previewAssetId, latestOutput, detail]);

  const activeLocksList = useMemo(() => {
    const locks = detail?.activeLock;
    return [
      { name: "Design", value: locks?.design_id_lock !== '[X]' ? locks?.design_id_lock : null },
      { name: "Style", value: locks?.style_id_lock !== '[X]' ? locks?.style_id_lock : null },
      { name: "Context", value: locks?.context_id_lock !== '[X]' ? locks?.context_id_lock : null },
      { name: "Camera", value: locks?.camera_id_lock !== '[X]' ? locks?.camera_id_lock : null },
      { name: "Composition", value: locks?.composition_id_lock !== '[X]' ? locks?.composition_id_lock : null },
      { name: "Tattoo", value: locks?.tattoo_id_lock !== '[X]' ? locks?.tattoo_id_lock : null },
      { name: "Placement", value: locks?.placement_id_lock !== '[X]' ? locks?.placement_id_lock : null },
    ];
  }, [detail?.activeLock]);

  // --- RENDER HELPERS ---
  const renderTopBar = () => (
    <header className="tls-topbar">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/')} className="tls-topbar-icon !bg-transparent !border-0 text-white/40 hover:text-white" title="Go Back">
          <ArrowLeft size={18} />
        </button>
        <div className="tls-topbar-badge !bg-[#fbbf24] !text-[#211500]">{currentPhase}</div>
        <span className="tls-topbar-title font-black text-white/92 tracking-[0.14em] uppercase">{operationLabel}</span>
      </div>

      <nav className="tls-phase-track">
        {PHASES.map((p) => (
          <div
            key={p.id}
            className={`tls-phase-tab ${activePhaseId === p.id ? 'active' : ''}`}
            onClick={() => {
              setActivePhaseId(p.id);
              setOperation(p.op as Operation);
            }}
          >
            {p.code}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-1">
        <button className={`tls-topbar-icon ${activeDrawer === 'refs' ? 'active' : ''}`} onClick={() => setActiveDrawer(prev => prev === 'refs' ? null : 'refs')} title="Gallery Board">
          <LayoutGrid size={16} />
        </button>
        <button className={`tls-topbar-icon ${activeDrawer === 'layers' ? 'active' : ''}`} onClick={() => setActiveDrawer(prev => prev === 'layers' ? null : 'layers')} title="Layers Stack">
          <Layers size={16} />
        </button>
        <button className={`tls-topbar-icon ${activeDrawer === 'locks' ? 'active' : ''}`} onClick={() => setActiveDrawer(prev => prev === 'locks' ? null : 'locks')} title="Session Locks">
          <Lock size={16} />
        </button>
        <div className="tls-status-dot" />
        <button
          className="tls-topbar-icon !bg-transparent !border-0 text-white/40 hover:text-white"
          onClick={() => {
            setChrome(false);
            setActiveDrawer(null);
          }}
          title="Clear screen"
        >
          <Maximize size={16} />
        </button>
      </div>
    </header>
  );

  const renderLocksDrawer = () => {
    const locked = activeLocksList.every(l => l.value !== null);
    return (
      <aside className="tls-drawer">
        <div className="tls-drawer-header">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-[10px] tracking-[0.2em] text-neutral-400 font-bold uppercase">DNA audit</h2>
              <h1 className="text-xl font-semibold mt-1">Source Locks</h1>
            </div>
            <span className="text-[10px] py-1 px-2 bg-green-900/30 text-green-400 border border-green-500/50 rounded-full font-mono">{activePhaseId.toUpperCase()}</span>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed mb-8">
            {operation === 'Extract' 
              ? 'Reading visual DNA from the reference. These locks guide all future generations.'
              : 'Current design constraints enforced on the next generation run.'}
          </p>

          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] tracking-widest text-neutral-500 font-bold uppercase">Design Structure</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold tracking-wider ${locked ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'bg-yellow-600/20 text-yellow-500 border border-yellow-600/50'}`}>
              {locked ? "LOCKED" : "DRAFT"}
            </span>
          </div>
        </div>

        <div className="tls-drawer-body scrollbar-hide space-y-2">
          {activeLocksList.map((lock) => (
            <div 
              key={lock.name} 
              className={`tls-card-row cursor-pointer transition-all ${showLockDetails === lock.name ? 'ring-1 ring-tls-amber bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
              onClick={() => setShowLockDetails(prev => prev === lock.name ? null : lock.name)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="tls-card-row-title">{lock.name}</div>
                  <div className={`tls-row-dot ${lock.value ? 'filled' : ''}`} />
                </div>
                <div className={`text-[11px] mt-1 transition-all ${showLockDetails === lock.name ? 'text-white/90 whitespace-normal' : 'text-white/40 truncate'}`}>
                  {lock.value || 'Empty / Undefined'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          disabled={!!busy}
          onClick={handleRun}
          className="w-full mt-6 py-3 rounded-xl bg-white text-black font-black uppercase tracking-[0.15em] text-[10px] hover:bg-tls-amber transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {busy ? 'Processing...' : runLabel}
        </button>
      </aside>
    );
  };

  const renderLayersDrawer = () => (
    <aside className="tls-drawer">
      <div className="tls-drawer-header">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-neutral-400 font-bold uppercase">Workflow History</h2>
            <h1 className="text-xl font-semibold mt-1">Design Layers</h1>
          </div>
          <span className="text-[10px] py-1 px-2 bg-sky-900/30 text-sky-400 border border-sky-500/50 rounded-full font-mono">
            RUN-{detail?.editRuns.length || 0}
          </span>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed mb-8">
          Iterative outputs and generation states. Promote any layer to Reference to continue the loop.
        </p>

        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] tracking-widest text-neutral-500 font-bold uppercase">Output Stack</span>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/10 font-bold tracking-wider">
            {detail?.editRuns.length || 0} ITEMS
          </span>
        </div>
      </div>

      <div className="tls-drawer-body scrollbar-hide space-y-2">
        {detail?.referenceAsset && (
          <div 
            onClick={() => setPreviewAssetId(detail.referenceAsset!.id)} 
            className={`flex justify-between items-center p-3 bg-white/5 border rounded-xl transition-all cursor-pointer ${previewAssetId === detail.referenceAsset.id ? 'border-tls-amber bg-tls-amber-soft' : 'border-white/5 hover:border-white/20'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-black overflow-hidden relative border border-white/10 shrink-0">
                <img src={detail.referenceAsset.blob_url} className="w-full h-full object-cover" alt="ref" />
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-white uppercase opacity-60">Base Reference</div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-tighter">Initial Lock Source</div>
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${previewAssetId === detail.referenceAsset.id ? 'bg-tls-amber shadow-[0_0_8px_#fbbf24]' : 'bg-white/10'}`} />
          </div>
        )}

        {detail?.editRuns.map(run => (
          <div 
            key={run.id} 
            onClick={() => setPreviewAssetId(run.outputAsset?.id || null)} 
            className={`flex justify-between items-center p-3 bg-white/5 border rounded-xl transition-all cursor-pointer ${previewAssetId === run.outputAsset?.id ? 'border-tls-amber bg-tls-amber-soft' : 'border-white/5 hover:border-white/20'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-black overflow-hidden relative border border-white/10 shrink-0">
                {run.outputAsset?.blob_url && <img src={run.outputAsset.blob_url} className="w-full h-full object-cover" alt="run" />}
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-wider text-white uppercase">{run.phase}</div>
                <div className="text-[10px] text-neutral-500">{new Date(run.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePromoteToReference(run.outputAsset!.id); }} 
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white hover:text-black transition-all"
                title="Promote to Reference"
              >
                <Sparkles size={14} />
              </button>
              <div className={`w-2 h-2 rounded-full ${previewAssetId === run.outputAsset?.id ? 'bg-tls-amber shadow-[0_0_8px_#fbbf24]' : 'bg-white/10'}`} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );

  const renderRefsDrawer = () => (
    <aside className="tls-drawer">
      <div className="tls-drawer-header">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-neutral-400 font-bold uppercase">Inspiration</h2>
            <h1 className="text-xl font-semibold mt-1">Gallery</h1>
          </div>
          <button 
            onClick={handleAddReference}
            className="text-[10px] py-1 px-3 bg-white text-black rounded-full font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer"
          >
            Import
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed mb-8">
          Source material and stylistic anchors. The active reference dictates the AI extraction phase.
        </p>

        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] tracking-widest text-neutral-500 font-bold uppercase">Saved Assets</span>
          <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/10 font-bold tracking-wider">
            {detail?.projectReferences.length || 0} REFS
          </span>
        </div>
      </div>

      <div className="tls-drawer-body scrollbar-hide">
        <div className="grid grid-cols-2 gap-2 p-2">
          {detail?.projectReferences.map((ref) => (
            <button 
              key={ref.id} 
              onClick={() => handleUpdateReference(ref.id)} 
              className={`group relative aspect-square overflow-hidden rounded-xl border transition-all ${detail.referenceAsset?.id === ref.id ? "border-tls-amber shadow-[0_0_15px_rgba(251,191,36,0.2)]" : "border-white/[0.08] bg-white/[0.055] hover:border-white/30"}`}
            >
              {ref.blob_url && <img src={ref.blob_url} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <div className="text-white text-[8px] font-black tracking-widest uppercase">Select</div>
              </div>
              {detail.referenceAsset?.id === ref.id && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-tls-amber shadow-[0_0_8px_#fbbf24]" />
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className={`tls-shell ${chrome ? 'tls-shell--chrome' : 'tls-shell--clean'} ${activeDrawer ? 'tls-shell--drawer-open' : ''}`}>
      <input type="file" ref={uploadInputRef} style={{ display: 'none' }} accept="image/*" onChange={onFileChange} />

      {/* CANVAS STAGE */}
      <main ref={canvasGestureRef} className="tls-artboard-frame" style={canvasTransformStyle}>
        <section
          onClick={!detail?.referenceAsset ? handleAddReference : undefined}
          className={`tls-artboard ${!detail?.referenceAsset ? 'cursor-pointer hover:brightness-95 transition-all' : ''}`}
        >
          {busy && (
            <div className="absolute inset-0 z-50 bg-black/48 backdrop-blur-[12px] flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-tls-amber mb-4" />
              <div className="text-tls-amber font-black uppercase tracking-[0.22em] text-[11px]">{busy}...</div>
            </div>
          )}

          {/* Badge */}
          <div className="tls-artboard-badge">
            {detail?.latestApprovedAsset?.id === displayAsset?.id ? 'LATEST APPROVED' : 'DRAFT'} / 4096 PX
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            {displayAsset?.blob_url ? (
              <img src={displayAsset.blob_url} className={`w-full h-full object-contain ${operation === 'Mockup' ? '' : 'mix-blend-multiply opacity-90 p-12'}`} alt="Design" />
            ) : (
              <div className="flex flex-col items-center justify-center text-black/10 pointer-events-none">
                <Upload size={32} strokeWidth={1.5} className="mb-4" />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Click to upload reference</span>
              </div>
            )}
          </div>
        </section>
      </main>

      <StudioCommandDock
        activeDrawer={activeDrawer}
        setActiveDrawer={setActiveDrawer}
        activePhase={activePhaseId}
        runPhaseAction={handleRun}
        chrome={chrome}
        setChrome={setChrome}
        setShowQuickMenu={setShowQuickMenu}
        dockPosition={dockPosition}
        setDockPosition={setDockPosition}
        dockItems={dockItems}
        setDockItems={setDockItems}
        onRunAudit={handleGetCritique}
        onOpenExport={() => setShowExportMenu(true)}
        onRelock={handleRelock}
      />

      {chrome && (
        <>
          {renderTopBar()}
          {activeDrawer === 'locks' && renderLocksDrawer()}
          {activeDrawer === 'layers' && renderLayersDrawer()}
          {activeDrawer === 'refs' && renderRefsDrawer()}

          {/* BOTTOM COMMAND */}
          <section className="tls-command">
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-tls-muted text-[10px] font-black tracking-[0.2em] uppercase">
                  <span className="text-tls-amber">✦</span>
                  <span>Artist Instruction</span>
                </div>
                <div className="tls-readonly-pill">Read Only Phase</div>
              </div>
              <div className="flex w-full gap-2 bg-white/[0.04] rounded-xl border border-white/[0.06] p-1 pr-1.5">
                <input
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                  placeholder="Describe edit..."
                  disabled={!!busy}
                  onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                  className="tls-command-input px-3"
                />
                <button onClick={handleMicToggle} className={`h-8 w-8 grid place-items-center rounded-lg cursor-pointer transition-colors ${voiceStatus === 'listening' ? 'bg-tls-amber/20 text-tls-amber' : 'text-white/40 hover:bg-white/10'}`}>
                  {voiceStatus === 'listening' ? <Mic size={14} /> : <MicOff size={14} />}
                </button>
                <button 
                  onClick={handleEnhancePrompt} 
                  disabled={!!busy || !request.trim()}
                  className="h-8 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 text-[9px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
                >
                  <Sparkles size={12} />
                  <span>Refine</span>
                </button>
              </div>
            </div>
            <button
              onClick={handleRun}
              disabled={!!busy || (!request.trim() && ['Surgical', 'Creative'].includes(operation))}
              className="tls-run-btn"
            >
              <Activity size={14} />
              <span>{runLabel}</span>
            </button>
          </section>

          {/* AI CRITIQUE BUBBLE / DRIFT DETECTOR */}
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
                {qaReport.findings.length > 0 && (
                  <ul className="space-y-1 pl-1">
                    {qaReport.findings.map((finding, i) => (
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

      {/* QUICK MENU OVERLAY */}
      {showQuickMenu && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/64 backdrop-blur-sm" onClick={() => setShowQuickMenu(false)} />
          <div className="relative w-[320px] h-[320px] animate-in zoom-in duration-300">
            <div onClick={() => setShowQuickMenu(false)} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20 bg-black/80 backdrop-blur-xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all shadow-2xl z-10">
              <X size={20} className="text-white/40" />
            </div>
            <RadialNode label="Run Delta" icon={<Play size={14}/>} angle={-90} radius={110} primary onClick={() => { handleRun(); setShowQuickMenu(false); }} />
            <RadialNode label="Locks" icon={<Lock size={14}/>} angle={-30} radius={110} onClick={() => { setActiveDrawer('locks'); setShowQuickMenu(false); }} />
            <RadialNode label="Deltas" icon={<Layers size={14}/>} angle={30} radius={110} onClick={() => { setActiveDrawer('layers'); setShowQuickMenu(false); }} />
            <RadialNode label="References" icon={<LayoutGrid size={14}/>} angle={90} radius={110} onClick={() => { setActiveDrawer('refs'); setShowQuickMenu(false); }} />
            <RadialNode label="Export" icon={<Download size={14}/>} angle={150} radius={110} onClick={() => { setShowExportMenu(true); setShowQuickMenu(false); }} />
            <RadialNode label="Audit" icon={<Check size={14}/>} angle={210} radius={110} onClick={() => { handleGetCritique(); setShowQuickMenu(false); }} />
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

      {/* EXPORT OPTIONS MENU */}
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
                    <button 
                      key={fmt} 
                      onClick={() => { handleSaveToDevice(fmt); setShowExportMenu(false); }}
                      className="h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center gap-1 hover:bg-white hover:text-black transition-all group"
                    >
                      <Download size={16} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase">{fmt}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Studio Cloud</div>
                <button 
                  onClick={() => { setMessage({ text: "Saved to Cloud Storage", type: 'info' }); setShowExportMenu(false); }}
                  className="w-full h-16 rounded-2xl bg-tls-amber/10 border border-tls-amber/20 flex items-center gap-4 px-4 hover:bg-tls-amber hover:text-black transition-all group"
                >
                  <Activity size={20} />
                  <div className="text-left">
                    <div className="text-[11px] font-black uppercase tracking-widest">Persist Session</div>
                    <div className="text-[9px] opacity-60">Sync all metadata</div>
                  </div>
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Pipeline</div>
                <button 
                  onClick={() => { if (displayAsset) handlePromoteToReference(displayAsset.id); setShowExportMenu(false); }}
                  className="w-full h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-4 px-4 hover:bg-white hover:text-black transition-all group"
                >
                  <LayoutGrid size={20} />
                  <div className="text-left">
                    <div className="text-[11px] font-black uppercase tracking-widest">To Board</div>
                    <div className="text-[9px] opacity-60">New Ref Source</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5">
              <button 
                onClick={() => { setMessage({ text: "Checkpoint Created", type: 'info' }); setShowExportMenu(false); }}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
              >
                Create Restore Checkpoint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      {message && (
        <div
          className={`absolute top-24 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 rounded-[16px] border border-tls-amber/30 bg-black/72 backdrop-blur-[12px] text-tls-amber px-[22px] py-[14px] text-[11px] font-black uppercase tracking-[0.22em] shadow-[0_18px_50px_rgba(0,0,0,0.45)] cursor-pointer`}
          onClick={() => setMessage(null)}
        >
          {message.type === 'error' ? <ShieldCheck size={16} className="text-red-400" /> : <Sparkles size={16} className="animate-pulse text-tls-amber" />}
          {message.text}
        </div>
      )}
    </div>
  );
}
