'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, ArrowLeft, Layers, Sparkles, X, Download } from 'lucide-react';
import type { FlashBoardDetail, FlashDesign, FlashTheme } from '@/types/flash';
import { DesignCard, ThemePill, STATUS_COLORS } from './flash-board-atoms';
import { ExportPanel, ExportResult, GeneratePanel, ThemeDetailModal } from './flash-board-modals';

export function FlashBoardClient({ detail }: { detail: FlashBoardDetail }) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement | null>(null);

  // ── Core state ─────────────────────────────────────────────────────────────
  const [designs, setDesigns] = useState<FlashDesign[]>(detail.designs);
  const [themes, setThemes] = useState<FlashTheme[]>(detail.themes);
  const [selectedDesign, setSelectedDesign] = useState<FlashDesign | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(
    detail.themes.find(t => t.is_active)?.id ?? null
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  // ── Export state ───────────────────────────────────────────────────────────
  const [exportMode, setExportMode] = useState(false);
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportLayout, setExportLayout] = useState<'1x1'|'1x2'|'2x2'|'2x3'|'3x3'>('2x2');
  const [exportTitle, setExportTitle] = useState(detail.board.title);
  const [exportIncludeBack, setExportIncludeBack] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportBackUrl, setExportBackUrl] = useState<string | null>(null);
  const [exportPdfBusy, setExportPdfBusy] = useState(false);

  // ── Generate state ─────────────────────────────────────────────────────────
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [generateSubject, setGenerateSubject] = useState('');
  const [generating, setGenerating] = useState(false);

  // ── Theme extraction state ─────────────────────────────────────────────────
  const [extractingTheme, setExtractingTheme] = useState(false);
  const [themeDetail, setThemeDetail] = useState<FlashTheme | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeTheme = themes.find(t => t.id === activeThemeId) ?? null;
  const filteredDesigns = activeThemeId
    ? designs.filter(d => d.flash_theme_id === activeThemeId)
    : designs;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleExportSelect = (id: string) =>
    setExportSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSelectDesign = (d: FlashDesign) =>
    setSelectedDesign(prev => prev?.id === d.id ? null : d);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setStatus('UPLOADING...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch(`/api/flash/boards/${detail.board.id}/upload`, { method: 'POST', body: formData });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Upload failed');
      setDesigns(prev => [data.design, ...prev]);
      setStatus('Design added.');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false); e.target.value = '';
    }
  };

  const handleExtractTheme = async () => {
    if (!selectedDesign || extractingTheme) return;
    setExtractingTheme(true); setStatus('EXTRACTING THEME...');
    try {
      const resp = await fetch(`/api/flash/boards/${detail.board.id}/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: selectedDesign.asset_id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Extraction failed');
      const newTheme: FlashTheme = data.theme;
      setThemes(prev => [newTheme, ...prev]);
      setActiveThemeId(newTheme.id);
      setThemeDetail(newTheme);
      setStatus(`Theme "${newTheme.title}" extracted.`);
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtractingTheme(false);
    }
  };

  const handleGenerate = async () => {
    if (!activeThemeId || !generateSubject.trim() || generating) return;
    setGenerating(true); setStatus('GENERATING...');
    try {
      const resp = await fetch(`/api/flash/boards/${detail.board.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: activeThemeId, subjectRequest: generateSubject.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Generation failed');
      setDesigns(prev => [data.design, ...prev]);
      setGenerateSubject(''); setShowGeneratePanel(false);
      setStatus('Design generated.');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    if (exportSelected.size === 0 || exporting) return;
    setExporting(true);
    try {
      const resp = await fetch(`/api/flash/boards/${detail.board.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designIds: Array.from(exportSelected),
          layout: exportLayout,
          sheetTitle: exportTitle.trim() || detail.board.title,
          includeBack: exportIncludeBack,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Export failed');
      setExportUrl(data.export.front);
      setExportBackUrl(data.export.back ?? null);
      setShowExportPanel(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Export failed');
      setShowExportPanel(false);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!exportUrl || exportPdfBusy) return;
    setExportPdfBusy(true);
    try {
      const resp = await fetch(`/api/flash/boards/${detail.board.id}/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontUrl: exportUrl, backUrl: exportBackUrl ?? null, sheetTitle: exportTitle }),
      });
      if (!resp.ok) throw new Error('PDF generation failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'flash-sheet.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'PDF failed');
    } finally {
      setExportPdfBusy(false);
    }
  };

  const closeExportResult = () => {
    setExportUrl(null); setExportBackUrl(null);
    setShowExportPanel(false); setExportMode(false);
    setExportSelected(new Set());
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-tls-bg overflow-hidden flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/flash')} className="text-white/30 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <div className="text-white font-black text-sm">{detail.board.title}</div>
            {detail.board.description && <div className="text-white/30 text-[10px]">{detail.board.description}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && <span className="text-[10px] font-black uppercase tracking-widest text-tls-amber">{status}</span>}
          {!exportMode ? (
            <>
              <button onClick={() => uploadRef.current?.click()} disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40">
                <Upload size={13} /> Add Design
              </button>
              <button
                disabled={busy || generating}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-40 ${activeThemeId ? 'bg-tls-amber text-black hover:bg-white' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
                onClick={() => activeThemeId && setShowGeneratePanel(true)}
                title={activeThemeId ? 'Generate a new design from active theme' : 'Select a theme first'}
              >
                <Sparkles size={13} /> Generate
              </button>
              <button onClick={() => { setExportMode(true); setExportSelected(new Set()); setSelectedDesign(null); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors">
                <Download size={13} /> Export Sheet
              </button>
            </>
          ) : (
            <>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{exportSelected.size} selected</span>
              <button onClick={() => { setExportMode(false); setExportSelected(new Set()); }}
                className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button disabled={exportSelected.size === 0} onClick={() => setShowExportPanel(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40">
                <Download size={13} /> Build Sheet ({exportSelected.size})
              </button>
            </>
          )}
        </div>
      </header>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      <div className="flex flex-1 overflow-hidden">

        {/* Theme rail */}
        <aside className="w-48 border-r border-white/[0.06] flex flex-col p-4 gap-2 shrink-0 overflow-y-auto">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25 mb-2">Themes</div>
          <button
            onClick={() => setActiveThemeId(null)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${activeThemeId === null ? 'border-tls-amber bg-tls-amber text-black' : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-white/30 hover:text-white'}`}
          >
            All
          </button>
          {themes.map(theme => (
            <ThemePill key={theme.id} theme={theme} active={activeThemeId === theme.id}
              onSelect={() => setActiveThemeId(prev => prev === theme.id ? null : theme.id)} />
          ))}
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-white/10 text-[10px] font-black uppercase tracking-widest text-white/20 hover:border-tls-amber/30 hover:text-tls-amber transition-all mt-2"
            onClick={() => {
              if (activeThemeId) { setShowGeneratePanel(true); }
              else { setStatus('Select a design → Extract Theme first.'); setTimeout(() => setStatus(''), 3000); }
            }}
          >
            <Plus size={10} /> Theme
          </button>
        </aside>

        {/* Main grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {filteredDesigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center">
                <Layers size={28} className="text-white/10" />
              </div>
              <div>
                <div className="text-white/20 text-[11px] font-black uppercase tracking-[0.3em] mb-2">
                  {activeThemeId ? 'No designs in this theme' : 'Empty Board'}
                </div>
                <div className="text-white/30 text-sm">Upload a design or generate new flash from a theme.</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => uploadRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors">
                  <Upload size={13} /> Upload
                </button>
                <button onClick={() => activeThemeId ? setShowGeneratePanel(true) : setStatus('Select a theme first')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors">
                  <Sparkles size={13} /> Generate
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredDesigns.map(design => (
                <DesignCard
                  key={design.id}
                  design={design}
                  selected={selectedDesign?.id === design.id}
                  exportMode={exportMode}
                  exportSelected={exportSelected.has(design.id)}
                  onSelect={(d) => exportMode ? toggleExportSelect(d.id) : handleSelectDesign(d)}
                />
              ))}
              {!exportMode && (
                <button onClick={() => uploadRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-3 group">
                  <Plus size={20} className="text-white/10 group-hover:text-white/40 transition-colors" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/10 group-hover:text-white/30">Add</span>
                </button>
              )}
            </div>
          )}
        </main>

        {/* Selected design detail panel */}
        {selectedDesign && !exportMode && (
          <aside className="w-64 border-l border-white/[0.06] flex flex-col shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Selected</div>
              <button onClick={() => setSelectedDesign(null)} className="text-white/30 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
            {selectedDesign.blob_url && (
              <div className="p-4 border-b border-white/[0.06]">
                <img src={selectedDesign.blob_url} className="w-full rounded-xl" alt="" />
              </div>
            )}
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25 mb-1">Title</div>
                <div className="text-white text-sm">{selectedDesign.title ?? '—'}</div>
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25 mb-1">Placement</div>
                <div className="text-white text-sm">{selectedDesign.placement_hint ?? '—'}</div>
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25 mb-1">Status</div>
                <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[selectedDesign.status]}`}>
                  {selectedDesign.status}
                </span>
              </div>
              {selectedDesign.tags?.length > 0 && (
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25 mb-2">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedDesign.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[9px] text-white/50">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-4 space-y-2">
                <button disabled={extractingTheme} onClick={handleExtractTheme}
                  className="w-full py-2.5 rounded-xl bg-tls-amber text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40">
                  {extractingTheme ? 'Extracting...' : 'Extract Theme'}
                </button>
                <button onClick={() => { if (selectedDesign?.flash_theme_id) setActiveThemeId(selectedDesign.flash_theme_id); setShowGeneratePanel(true); }}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors">
                  Generate Variations
                </button>
                <button onClick={() => router.push('/studio')}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors">
                  Open in Studio
                </button>
                <button
                  className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400/60 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  onClick={async () => {
                    const resp = await fetch(`/api/flash/designs/${selectedDesign.id}`, { method: 'DELETE' });
                    if (resp.ok) { setDesigns(prev => prev.filter(d => d.id !== selectedDesign.id)); setSelectedDesign(null); }
                  }}>
                  Remove from Board
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      {showExportPanel && (
        <ExportPanel
          count={exportSelected.size} exporting={exporting}
          exportTitle={exportTitle} setExportTitle={setExportTitle}
          exportLayout={exportLayout} setExportLayout={setExportLayout}
          exportIncludeBack={exportIncludeBack} setExportIncludeBack={setExportIncludeBack}
          onExport={handleExport} onClose={() => setShowExportPanel(false)}
        />
      )}
      {exportUrl && (
        <ExportResult
          frontUrl={exportUrl} backUrl={exportBackUrl}
          pdfBusy={exportPdfBusy} onDownloadPdf={handleExportPdf}
          onClose={closeExportResult}
        />
      )}
      {showGeneratePanel && activeTheme && (
        <GeneratePanel
          activeTheme={activeTheme} generating={generating}
          subject={generateSubject} setSubject={setGenerateSubject}
          onGenerate={handleGenerate} onClose={() => setShowGeneratePanel(false)}
        />
      )}
      {themeDetail && (
        <ThemeDetailModal theme={themeDetail} onClose={() => setThemeDetail(null)} />
      )}
    </div>
  );
}
