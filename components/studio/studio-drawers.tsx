'use client';

import React, { useState } from 'react';
import { Sparkles, Lock, ImagePlus, X, LayoutGrid } from 'lucide-react';
import type { SessionDetailRecord, SessionAssetRecord } from '@/lib/server/session-detail';
import type { PieceState, DesignPhase } from '@/types/domain';
import type { Operation } from './studio-sidebar';
import { PHASES } from './studio-atoms';

// ── Shared ────────────────────────────────────────────────────────────────────

type GateMap = Record<string, { status: string; unmet: { key: string; label: string }[] }>;

// ── PhaseSidebar ──────────────────────────────────────────────────────────────

export function PhaseSidebar({ activePhaseId, gates, onSelect }: {
  activePhaseId: DesignPhase;
  gates: GateMap;
  onSelect: (phase: DesignPhase, op: string) => void;
}) {
  return (
    <aside className="tls-sidebar">
      {PHASES.map((p) => {
        const isLocked = gates[p.id].status === 'locked';
        const isActive = activePhaseId === p.id;
        return (
          <button
            key={p.id}
            disabled={isLocked}
            onClick={() => { if (!isLocked) onSelect(p.id, p.op); }}
            className={`tls-sidebar-tab ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
          >
            {isLocked ? <Lock size={14} /> : p.icon}
            <div className="tls-sidebar-label">{p.label}</div>
          </button>
        );
      })}
    </aside>
  );
}

// ── LocksDrawer ───────────────────────────────────────────────────────────────

export interface LockItem { name: string; value: string | null | undefined; }

export function LocksDrawer({ activeLocksList, activePhaseId, operation, busy, runLabel, onRun }: {
  activeLocksList: LockItem[];
  activePhaseId: string;
  operation: Operation;
  busy: string | null;
  runLabel: string;
  onRun: () => void;
}) {
  const [showLockDetails, setShowLockDetails] = useState<string | null>(null);
  const locked = activeLocksList.every(l => l.value !== null);

  return (
    <aside className="tls-drawer">
      <div className="tls-drawer-header">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-neutral-400 font-bold uppercase">Locks</h2>
            <h1 className="text-xl font-semibold mt-1">Extraction</h1>
          </div>
          <span className="text-[10px] py-1 px-2 bg-green-900/30 text-green-400 border border-green-500/50 rounded-full font-mono">
            {activePhaseId.toUpperCase()}
          </span>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed mb-8">
          {operation === 'Extract'
            ? 'Reading visual DNA from the reference. These locks guide all future generations.'
            : 'Current design constraints enforced on the next generation run.'}
        </p>
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] tracking-widest text-neutral-500 font-bold uppercase">Locks Extracted</span>
          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold tracking-wider ${locked ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'bg-yellow-600/20 text-yellow-500 border border-yellow-600/50'}`}>
            {locked ? 'LOCKED' : 'DRAFT'}
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
        onClick={onRun}
        className="w-full mt-6 py-3 rounded-xl bg-white text-black font-black uppercase tracking-[0.15em] text-[10px] hover:bg-tls-amber transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {busy ? 'Processing...' : runLabel}
      </button>
    </aside>
  );
}

// ── LayersDrawer ──────────────────────────────────────────────────────────────

export function LayersDrawer({ detail, previewAssetId, setPreviewAssetId, onPromote }: {
  detail: SessionDetailRecord | undefined;
  previewAssetId: string | null;
  setPreviewAssetId: (id: string | null) => void;
  onPromote: (assetId: string) => void;
}) {
  return (
    <aside className="tls-drawer">
      <div className="tls-drawer-header">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-neutral-400 font-bold uppercase">Workflow History</h2>
            <h1 className="text-xl font-semibold mt-1">Design Deltas</h1>
          </div>
          <span className="text-[10px] py-1 px-2 bg-sky-900/30 text-sky-400 border border-sky-500/50 rounded-full font-mono">
            RUN-{detail?.editRuns.length || 0}
          </span>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed mb-8">
          Iterative outputs and generation states. Promote any delta to Reference to continue the loop.
        </p>
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] tracking-widest text-neutral-500 font-bold uppercase">Delta History</span>
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

        {detail?.editRuns?.map(run => (
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
                <div className="text-[10px] text-neutral-500">{new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onPromote(run.outputAsset!.id); }}
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
}

// ── RefsDrawer ────────────────────────────────────────────────────────────────

export function RefsDrawer({ detail, piece, activePhaseId, onSelect, onAddReference, boardHiddenIds, onRestoreToBoard }: {
  detail: SessionDetailRecord | undefined;
  piece: PieceState;
  activePhaseId: DesignPhase;
  onSelect: (assetId: string) => void;
  onAddReference: () => void;
  boardHiddenIds: string[];
  onRestoreToBoard: (assetId: string) => void;
}) {
  const hiddenRefs = (detail?.projectReferences ?? []).filter(r => boardHiddenIds.includes(r.id));

  return (
    <aside className="tls-drawer">
      <div className="tls-drawer-header">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-[10px] tracking-[0.2em] text-neutral-400 font-bold uppercase">Inspiration</h2>
            <h1 className="text-xl font-semibold mt-1">Gallery</h1>
          </div>
          <button
            onClick={onAddReference}
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
          {detail?.projectReferences?.filter(r => !boardHiddenIds.includes(r.id)).map((ref) => {
            const activeRefs = piece.activeReferenceIds || [];
            const refIndex = activeRefs.indexOf(ref.id);
            const isBase = detail.referenceAsset?.id === ref.id;
            const isSelected = activePhaseId === 'reference' ? isBase : refIndex !== -1;
            return (
              <button
                key={ref.id}
                onClick={() => onSelect(ref.id)}
                className={`group relative aspect-square overflow-hidden rounded-xl border transition-all ${isSelected ? 'border-tls-amber shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-white/[0.08] bg-white/[0.055] hover:border-white/30'}`}
              >
                {ref.blob_url && (
                  <img
                    src={ref.blob_url}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-80 group-hover:scale-105'}`}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div className="text-white text-[8px] font-black tracking-widest uppercase">
                    {activePhaseId === 'reference' ? 'Select Base' : (refIndex !== -1 ? `Ref ${refIndex + 1}` : 'Link Edit')}
                  </div>
                </div>
                {activePhaseId === 'reference' && isBase && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-tls-amber shadow-[0_0_8px_#fbbf24]" />
                )}
                {activePhaseId !== 'reference' && refIndex !== -1 && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-tls-amber text-black text-[9px] font-black shadow-lg">
                    REF {refIndex + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {hiddenRefs.length > 0 && (
          <div className="mt-4 px-2">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25 mb-2 px-1">
              Hidden from Board ({hiddenRefs.length})
            </div>
            <div className="grid grid-cols-2 gap-2">
              {hiddenRefs.map((ref) => (
                <div key={ref.id} className="relative group aspect-square overflow-hidden rounded-xl border border-white/[0.06] opacity-50">
                  {ref.blob_url && (
                    <img src={ref.blob_url} className="absolute inset-0 w-full h-full object-cover grayscale" alt="hidden ref" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onRestoreToBoard(ref.id)}
                      className="px-3 py-1.5 rounded-full bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-tls-amber transition-colors shadow-xl"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── ReferenceAssistHandle ─────────────────────────────────────────────────────

export function ReferenceAssistHandle({ piece, isReferenceAssistPhase, activeDrawer, setActiveDrawer }: {
  piece: PieceState;
  isReferenceAssistPhase: boolean;
  activeDrawer: string | null;
  setActiveDrawer: (d: string | null) => void;
}) {
  if (!isReferenceAssistPhase) return null;
  const selectedRefs = piece.activeReferenceIds || [];
  const isOpen = activeDrawer === 'assistRefs';
  return (
    <button
      type="button"
      onClick={() => setActiveDrawer(isOpen ? null : 'assistRefs')}
      className={`absolute left-5 top-5 z-30 flex h-9 min-w-9 items-center gap-2 rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.16em] shadow-2xl backdrop-blur-2xl transition-all ${
        isOpen || selectedRefs.length > 0
          ? 'border-tls-amber bg-tls-amber text-black'
          : 'border-white/10 bg-white/12 text-white/75 hover:bg-white hover:text-black'
      }`}
      title="Reference images for this edit"
    >
      <LayoutGrid size={13} />
      <span>{selectedRefs.length ? `${selectedRefs.length} Refs` : 'Refs'}</span>
    </button>
  );
}

// ── ReferenceAssistDrawer ─────────────────────────────────────────────────────

export function ReferenceAssistDrawer({ detail, piece, isReferenceAssistPhase, activeDrawer, setActiveDrawer, onSelect, onAddReference, onParamChange }: {
  detail: SessionDetailRecord | undefined;
  piece: PieceState;
  isReferenceAssistPhase: boolean;
  activeDrawer: string | null;
  setActiveDrawer: (d: string | null) => void;
  onSelect: (assetId: string) => void;
  onAddReference: () => void;
  onParamChange: (assetId: string, field: 'title' | 'promptLine', value: string) => void;
}) {
  if (!isReferenceAssistPhase || activeDrawer !== 'assistRefs') return null;

  const refs = detail?.projectReferences?.length
    ? detail.projectReferences
    : detail?.referenceAsset ? [detail.referenceAsset] : [];
  const activeRefs = piece.activeReferenceIds || [];

  return (
    <aside className="absolute left-5 top-16 z-30 w-[min(280px,calc(100%-40px))] overflow-hidden rounded-2xl border border-white/10 bg-black/76 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-start justify-between border-b border-white/10 p-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-tls-amber">Reference Assist</div>
          <div className="mt-1 text-sm font-semibold text-white">Edit References</div>
        </div>
        <button
          type="button"
          onClick={() => setActiveDrawer(null)}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <div className="max-h-[min(52dvh,420px)] overflow-y-auto p-3 scrollbar-hide">
        {refs.length === 0 ? (
          <button
            type="button"
            onClick={onAddReference}
            className="flex h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-white/35 transition-colors hover:border-tls-amber/50 hover:text-tls-amber"
          >
            <ImagePlus size={20} />
            <span className="mt-2 text-[9px] font-black uppercase tracking-[0.18em]">Import Reference</span>
          </button>
        ) : (
          <div className="space-y-2">
            {refs.map((ref) => {
              const refIndex = activeRefs.indexOf(ref.id);
              const isSelected = refIndex !== -1;
              const promptParam = piece.referencePromptParams?.[ref.id];
              const title = promptParam?.title ?? (isSelected ? `Ref${refIndex + 1}` : '');
              return (
                <div
                  key={ref.id}
                  className={`overflow-hidden rounded-xl border transition-all ${isSelected ? 'border-tls-amber shadow-[0_0_18px_rgba(251,191,36,0.28)]' : 'border-white/10 bg-white/[0.05] hover:border-white/35'}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(ref.id)}
                    className="group relative block aspect-[5/3] w-full overflow-hidden text-left"
                  >
                    {ref.blob_url && (
                      <img
                        src={ref.blob_url}
                        className={`absolute inset-0 h-full w-full object-cover transition-all ${isSelected ? 'opacity-100' : 'opacity-62 group-hover:opacity-90 group-hover:scale-105'}`}
                        alt="Edit reference"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                      <span className="text-[8px] font-black uppercase tracking-[0.14em] text-white">
                        {isSelected ? `${title || `Ref${refIndex + 1}`} selected` : 'Use as Ref'}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute right-2 top-2 rounded bg-tls-amber px-1.5 py-0.5 text-[9px] font-black text-black">
                        {title || `Ref${refIndex + 1}`}
                      </div>
                    )}
                  </button>
                  {isSelected && (
                    <div className="space-y-2 border-t border-white/10 bg-black/35 p-2">
                      <input
                        value={title}
                        onChange={(e) => onParamChange(ref.id, 'title', e.target.value)}
                        placeholder={`Ref${refIndex + 1}`}
                        className="h-8 w-full rounded-lg border border-white/10 bg-white/[0.05] px-2 text-[10px] font-black uppercase tracking-[0.14em] text-white outline-none focus:border-tls-amber"
                      />
                      <input
                        value={promptParam?.promptLine ?? ''}
                        onChange={(e) => onParamChange(ref.id, 'promptLine', e.target.value)}
                        placeholder="Prompt line for this reference..."
                        className="h-8 w-full rounded-lg border border-white/10 bg-white/[0.05] px-2 text-[11px] text-white outline-none placeholder:text-white/25 focus:border-tls-amber"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
