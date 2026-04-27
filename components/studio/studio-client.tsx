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

export function StudioClient({ detail }: StudioClientProps) {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  // UI State
  const [activeDrawer, setActiveDrawer] = useState<string | null>('locks');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null);
  const [chrome, setChrome] = useState(true);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [qaReport, setQaReport] = useState<TattooQAReport | null>(null);

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
    switch (operation) {
      case 'Extract': return 'CORE-1A';
      case 'Surgical': return 'CORE-1D';
      case 'Creative': return 'CORE-1C';
      case 'Variant': return 'PHASE-3';
      default: return 'STUDIO';
    }
  }, [operation]);
  const [request, setRequest] = useState('');
  const [status, setStatus] = useState('Ready');
  const [fidelity, setFidelity] = useState(60);
  const [detailLevel, setDetailLevel] = useState(70);

  const { bootstrap, isBootstrapping, error: bootstrapError, clearError } = useStudioBootstrap();

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
        <div className="tls-topbar-badge !bg-[#fbbf24] !text-[#211500]">{operation === 'Extract' ? 'CORE-1A' : operation === 'Mockup' ? 'PHASE-3' : 'STUDIO'}</div>
        <span className="tls-topbar-title font-black text-white/92 tracking-[0.14em] uppercase">{operationLabel}</span>
      </div>

      <nav className="tls-phase-track">
        {['CORE-0', 'CORE-1A', 'CORE-1B', 'CORE-1C', 'CORE-1D', 'CORE-1E', 'TATTOO'].map((phase) => (
          <div
            key={phase}
            className={`tls-phase-tab ${phase === 'CORE-1A' ? 'active' : ''}`}
            onClick={() => phase === 'CORE-1A' ? setOperation('Extract') : null}
          >
            {phase}
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
        <button className="tls-topbar-icon !bg-transparent !border-0 text-white/40 hover:text-white">
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
              <h2 className="text-[10px] tracking-[0.2em] text-neutral-400 font-bold uppercase">Active Phase</h2>
              <h1 className="text-xl font-semibold mt-1">Extract Locks</h1>
            </div>
            <span className="text-[10px] py-1 px-2 bg-green-900/30 text-green-400 border border-green-500/50 rounded-full font-mono">CORE-1A</span>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed mb-8">
            {operation === 'Extract' 
              ? 'Read-only extraction. Uses AI to pull lock metadata from the selected reference.'
              : 'Current design constraints enforced on the next generation run.'}
          </p>

          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] tracking-widest text-neutral-500 font-bold uppercase">Design Structure</span>
            <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold tracking-wider ${locked ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'bg-yellow-600/20 text-yellow-500 border border-yellow-600/50'}`}>
              {locked ? "LOCKED" : "DRAFT"}
            </span>
          </div>
        </div>

        <div className="tls-drawer-body scrollbar-hide">
          {activeLocksList.map((lock) => (
            <div key={lock.name} className="tls-card-row">
              <div className="min-w-0">
                <div className="tls-card-row-title">{lock.name}</div>
                <div className="tls-card-row-sub truncate">{lock.value || 'Empty'}</div>
              </div>
              <div className={`tls-row-dot ${lock.value ? 'filled' : ''}`} />
            </div>
          ))}
        </div>

        <button
          disabled={!!busy}
          onClick={handleRun}
          className="tls-drawer-cta"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>
              <Sparkles size={14} />
              <span>RUN AI EXTRACTION</span>
            </>
          )}
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
    <div className={`tls-shell ${chrome ? 'tls-shell--chrome' : 'tls-shell--clean'} ${chrome && activeDrawer ? 'tls-shell--drawer-open' : ''}`}>
      <input type="file" ref={uploadInputRef} style={{ display: 'none' }} accept="image/*" onChange={onFileChange} />

      {/* CANVAS STAGE */}
      <main className="tls-artboard-frame">
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
              <>
                <img src={displayAsset.blob_url} className={`w-full h-full object-contain ${operation === 'Mockup' ? '' : 'mix-blend-multiply opacity-90 p-12'}`} alt="Design" />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-black/10 pointer-events-none">
                <Upload size={32} strokeWidth={1.5} className="mb-4" />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">Click to upload reference</span>
              </div>
            )}
          </div>
        </section>
      </main>

      {chrome && (
        <>
          {renderTopBar()}

          {/* SIDE MENU TRIGGER */}
          <button onClick={() => setQuickMenuOpen(true)} className="tls-side-menu-btn">
            <LayoutGrid size={22} />
          </button>

          {/* FLOATING TOOLS */}
          <aside className="tls-floating-toolbar">
            <LayoutGrid size={18} className="tls-floating-tool-icon" onClick={() => setActiveDrawer('refs')} />
            <Sparkles size={18} className="tls-floating-tool-icon" onClick={handleOptimize} />
            <MoveDiagonal size={18} className="tls-floating-tool-icon" />
          </aside>

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
              </div>
            </div>
            <button
              onClick={handleRun}
              disabled={!!busy || (!request.trim() && ['Surgical', 'Creative'].includes(operation))}
              className="tls-run-btn"
            >
              <Activity size={14} />
              <span>Run</span>
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

      {/* QUICK MENU: RIGHT EDGE COMMAND DOCK */}
      {quickMenuOpen && (
        <div className="tls-radial-scrim" onClick={() => setQuickMenuOpen(false)}>
          <div className="tls-radial-ring" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setQuickMenuOpen(false)} className="tls-radial-center">
              <Wand2 size={20} className="text-black" />
            </button>
            {[
              { label: "Run Check", icon: <Activity size={14} />, action: handleRun, active: false },
              { label: "Locks", icon: <Lock size={14} />, action: () => setActiveDrawer('locks'), active: activeDrawer === 'locks' },
              { label: "References", icon: <LayoutGrid size={14} />, action: () => setActiveDrawer('refs'), active: activeDrawer === 'refs' },
              { label: "Layers", icon: <History size={14} />, action: () => setActiveDrawer('layers'), active: activeDrawer === 'layers' },
              { label: "Status", icon: <ShieldCheck size={14} />, action: () => {}, active: true },
              { label: "Export", icon: <Download size={14} />, action: () => handleSaveToDevice('png'), active: false },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  a.action();
                  setQuickMenuOpen(false);
                }}
                className={`tls-radial-item ${a.active ? 'active' : ''}`}
              >
                {a.icon}
                <span>{a.label}</span>
              </button>
            ))}
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
