'use client';

import React from 'react';
import { X, Download, Sparkles } from 'lucide-react';
import type { FlashTheme } from '@/types/flash';

// ── Export Panel ──────────────────────────────────────────────────────────────

export function ExportPanel({
  count, exporting, exportTitle, setExportTitle,
  exportLayout, setExportLayout, exportIncludeBack, setExportIncludeBack,
  onExport, onClose,
}: {
  count: number;
  exporting: boolean;
  exportTitle: string;
  setExportTitle: (v: string) => void;
  exportLayout: '1x1' | '1x2' | '2x2' | '2x3' | '3x3';
  setExportLayout: (v: '1x1' | '1x2' | '2x2' | '2x3' | '3x3') => void;
  exportIncludeBack: boolean;
  setExportIncludeBack: (v: boolean) => void;
  onExport: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !exporting && onClose()} />
      <div className="relative w-[min(480px,92vw)] bg-tls-panel border border-tls-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-tls-amber mb-1">Export Flash Sheet</div>
            <div className="text-white font-black text-base">{count} design{count !== 1 ? 's' : ''} selected</div>
          </div>
          <button onClick={() => !exporting && onClose()} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Sheet Title</div>
            <input value={exportTitle} onChange={e => setExportTitle(e.target.value)} disabled={exporting}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-tls-amber placeholder:text-white/20 disabled:opacity-50" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Layout</div>
            <div className="grid grid-cols-5 gap-2">
              {(['1x1','1x2','2x2','2x3','3x3'] as const).map(val => (
                <button key={val} onClick={() => setExportLayout(val)} disabled={exporting}
                  className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${exportLayout === val ? 'border-tls-amber bg-tls-amber text-black' : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'}`}>
                  {val.replace('x','×')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Back Sheet</div>
            <button onClick={() => setExportIncludeBack(!exportIncludeBack)}
              className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between px-4 ${exportIncludeBack ? 'border-tls-amber bg-tls-amber/10 text-tls-amber' : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white'}`}>
              <span>Include Stencil / Outline Sheet</span>
              <span>{exportIncludeBack ? '✓' : '○'}</span>
            </button>
            <div className="text-[10px] text-white/20 mt-1 px-1">High-contrast B&W version for stencil transfer · 11×14 @ 300 DPI</div>
          </div>
        </div>

        <div className="p-6 border-t border-white/[0.06] flex gap-3">
          <button onClick={() => !exporting && onClose()} disabled={exporting}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors disabled:opacity-40">
            Cancel
          </button>
          <button onClick={onExport} disabled={exporting}
            className="flex-1 py-3 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {exporting ? <><Download size={13} className="animate-bounce" /> Building...</> : <><Download size={13} /> Build Sheet</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Export Result ─────────────────────────────────────────────────────────────

export function ExportResult({
  frontUrl, backUrl, pdfBusy, onDownloadPdf, onClose,
}: {
  frontUrl: string;
  backUrl: string | null;
  pdfBusy: boolean;
  onDownloadPdf: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[min(560px,92vw)] max-h-[90vh] bg-tls-panel border border-tls-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06] shrink-0">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-tls-emerald mb-1">Sheet Ready</div>
            <div className="text-white font-black text-base">Flash Sheet Built</div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4 scrollbar-hide">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Front Sheet</div>
            <img src={frontUrl} className="w-full rounded-xl border border-white/10" alt="Front Sheet" />
          </div>
          {backUrl && (
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Back Sheet — Stencil/Outline</div>
              <img src={backUrl} className="w-full rounded-xl border border-white/10" alt="Back Sheet" />
            </div>
          )}
        </div>
        <div className="p-6 border-t border-white/[0.06] shrink-0 space-y-2">
          <div className="flex gap-2">
            <a href={frontUrl} download="flash-sheet-front.png" target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors">
              <Download size={13} /> Front PNG
            </a>
            {backUrl && (
              <a href={backUrl} download="flash-sheet-back.png" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors">
                <Download size={13} /> Back PNG
              </a>
            )}
          </div>
          <button onClick={onDownloadPdf} disabled={pdfBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40">
            <Download size={13} />
            {pdfBusy ? 'Building PDF...' : `Download PDF${backUrl ? ' (Front + Back)' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate Panel ────────────────────────────────────────────────────────────

export function GeneratePanel({
  activeTheme, generating, subject, setSubject, onGenerate, onClose,
}: {
  activeTheme: FlashTheme;
  generating: boolean;
  subject: string;
  setSubject: (v: string) => void;
  onGenerate: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !generating && onClose()} />
      <div className="relative w-[min(520px,92vw)] bg-tls-panel border border-tls-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-tls-amber mb-1">Generate Flash Design</div>
            <div className="text-white font-black text-base">{activeTheme.title}</div>
          </div>
          <button onClick={() => !generating && onClose()} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Active Theme Lock</div>
            <div className="text-white/60 text-[11px] leading-relaxed italic">{activeTheme.raw_theme_lock?.slice(0, 180)}…</div>
            {activeTheme.style_family && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-tls-amber/10 border border-tls-amber/20 text-tls-amber text-[9px] font-black uppercase tracking-widest mt-2">
                {activeTheme.style_family}
              </span>
            )}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">What to generate</div>
            <textarea autoFocus value={subject} onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onGenerate()}
              placeholder={`e.g. "a bold eagle with spread wings"`}
              rows={3} disabled={generating}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-tls-amber placeholder:text-white/20 resize-none disabled:opacity-50" />
            <div className="text-[10px] text-white/20 mt-1">Shift+Enter for new line · Enter to generate</div>
          </div>
        </div>
        <div className="p-6 border-t border-white/[0.06] flex gap-3">
          <button onClick={() => !generating && onClose()} disabled={generating}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors disabled:opacity-40">
            Cancel
          </button>
          <button onClick={onGenerate} disabled={generating || !subject.trim()}
            className="flex-1 py-3 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {generating ? <><Sparkles size={13} className="animate-pulse" /> Generating...</> : <><Sparkles size={13} /> Generate</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Theme Detail Modal ────────────────────────────────────────────────────────

export function ThemeDetailModal({ theme, onClose }: {
  theme: FlashTheme;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[min(560px,92vw)] max-h-[85vh] bg-tls-panel border border-tls-border rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06] shrink-0">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-tls-amber mb-1">Theme Extracted</div>
            <div className="text-white font-black text-lg">{theme.title}</div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4 scrollbar-hide">
          {([
            ['Style Family',      theme.style_family],
            ['Palette',           theme.palette_lock],
            ['Motif Language',    theme.motif_lock],
            ['Line Weight',       theme.line_weight_lock],
            ['Shading',           theme.shading_lock],
            ['Composition Rules', theme.composition_rules],
          ] as [string, string | null][]).map(([label, value]) => (
            <div key={label}>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">{label}</div>
              <div className="text-white/80 text-[12px] leading-relaxed bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                {value ?? '[X]'}
              </div>
            </div>
          ))}
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Theme Lock (injected into generation)</div>
            <div className="text-white/60 text-[11px] leading-relaxed bg-tls-amber/5 border border-tls-amber/20 rounded-xl px-4 py-3 italic">
              {theme.raw_theme_lock ?? '[X]'}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-white/[0.06] shrink-0">
          <button onClick={onClose}
            className="w-full py-3 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors">
            Use This Theme
          </button>
        </div>
      </div>
    </div>
  );
}
