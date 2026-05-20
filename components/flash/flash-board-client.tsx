'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, ArrowLeft, Layers, Sparkles, CheckCircle2, X, Tag, MapPin } from 'lucide-react';
import type { FlashBoardDetail, FlashDesign, FlashTheme } from '@/types/flash';

const STATUS_COLORS = {
  draft:    'border-white/20 bg-white/[0.04] text-white/50',
  ready:    'border-tls-emerald/30 bg-tls-emerald/10 text-tls-emerald',
  archived: 'border-white/10 bg-white/[0.02] text-white/20',
};

function DesignCard({ design, onSelect, selected }: {
  design: FlashDesign;
  onSelect: (d: FlashDesign) => void;
  selected: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(design)}
      className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:z-10 ${
        selected
          ? 'border-tls-amber ring-4 ring-tls-amber/20 z-10'
          : 'border-white/[0.08] hover:border-white/30'
      }`}
    >
      {design.blob_url ? (
        <img src={design.blob_url} className="absolute inset-0 w-full h-full object-cover" alt={design.title ?? 'Flash design'} />
      ) : (
        <div className="absolute inset-0 bg-white/[0.03] flex items-center justify-center">
          <Layers size={24} className="text-white/10" />
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Status badge */}
      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[design.status]}`}>
        {design.status}
      </div>

      {/* AI badge */}
      {design.is_ai_generated && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-tls-amber/20 border border-tls-amber/30 flex items-center justify-center">
          <Sparkles size={10} className="text-tls-amber" />
        </div>
      )}

      {/* Selected check */}
      {selected && (
        <div className="absolute bottom-2 right-2">
          <CheckCircle2 size={18} className="text-tls-amber fill-tls-amber" />
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 inset-x-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {design.title && (
          <div className="text-white text-[10px] font-black uppercase tracking-widest truncate">{design.title}</div>
        )}
        {design.placement_hint && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={9} className="text-white/50" />
            <span className="text-white/50 text-[9px]">{design.placement_hint}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function ThemePill({ theme, active, onSelect }: { theme: FlashTheme; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
        active
          ? 'border-tls-amber bg-tls-amber text-black'
          : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-white/30 hover:text-white'
      }`}
    >
      <Tag size={10} />
      {theme.title}
    </button>
  );
}

export function FlashBoardClient({ detail }: { detail: FlashBoardDetail }) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<FlashDesign | null>(null);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(
    detail.themes.find(t => t.is_active)?.id ?? null
  );
  const [designs, setDesigns] = useState<FlashDesign[]>(detail.designs);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const activeTheme = detail.themes.find(t => t.id === activeThemeId) ?? null;
  const filteredDesigns = activeThemeId
    ? designs.filter(d => d.flash_theme_id === activeThemeId)
    : designs;

  const handleSelectDesign = (d: FlashDesign) => {
    setSelectedDesign(prev => prev?.id === d.id ? null : d);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus('UPLOADING...');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await fetch(`/api/flash/boards/${detail.board.id}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Upload failed');

      setDesigns(prev => [data.design, ...prev]);
      setStatus('Design added.');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

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
            {detail.board.description && (
              <div className="text-white/30 text-[10px]">{detail.board.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && <span className="text-[10px] font-black uppercase tracking-widest text-tls-amber">{status}</span>}
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors disabled:opacity-40"
          >
            <Upload size={13} />
            Add Design
          </button>
          <button
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40"
            onClick={() => setStatus('Theme generation coming in step 3')}
          >
            <Sparkles size={13} />
            Generate
          </button>
        </div>
      </header>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — theme rail */}
        <aside className="w-48 border-r border-white/[0.06] flex flex-col p-4 gap-2 shrink-0 overflow-y-auto">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25 mb-2">Themes</div>

          <button
            onClick={() => setActiveThemeId(null)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
              activeThemeId === null
                ? 'border-tls-amber bg-tls-amber text-black'
                : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-white/30 hover:text-white'
            }`}
          >
            All
          </button>

          {detail.themes.map(theme => (
            <ThemePill
              key={theme.id}
              theme={theme}
              active={activeThemeId === theme.id}
              onSelect={() => setActiveThemeId(prev => prev === theme.id ? null : theme.id)}
            />
          ))}

          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-white/10 text-[10px] font-black uppercase tracking-widest text-white/20 hover:border-tls-amber/30 hover:text-tls-amber transition-all mt-2"
            onClick={() => setStatus('Theme extraction coming in step 3')}
          >
            <Plus size={10} />
            Theme
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
                <div className="text-white/30 text-sm">
                  Upload an existing design or generate new flash from a theme.
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => uploadRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Upload size={13} />
                  Upload
                </button>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors"
                  onClick={() => setStatus('Theme generation coming in step 3')}
                >
                  <Sparkles size={13} />
                  Generate
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
                  onSelect={handleSelectDesign}
                />
              ))}
              <button
                onClick={() => uploadRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <Plus size={20} className="text-white/10 group-hover:text-white/40 transition-colors" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/10 group-hover:text-white/30">Add</span>
              </button>
            </div>
          )}
        </main>

        {/* Right panel — selected design detail */}
        {selectedDesign && (
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
                <div className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[selectedDesign.status]}`}>
                  {selectedDesign.status}
                </div>
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
                <button
                  className="w-full py-2.5 rounded-xl bg-tls-amber text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
                  onClick={() => setStatus('Extract theme — coming in step 2')}
                >
                  Extract Theme
                </button>
                <button
                  className="w-full py-2.5 rounded-xl border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors"
                  onClick={() => setStatus('Generate variations — coming in step 2')}
                >
                  Generate Variations
                </button>
                <button
                  className="w-full py-2.5 rounded-xl border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors"
                  onClick={() => router.push('/studio')}
                >
                  Open in Studio
                </button>
                <button
                  className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400/60 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  onClick={async () => {
                    if (!selectedDesign) return;
                    const resp = await fetch(`/api/flash/designs/${selectedDesign.id}`, { method: 'DELETE' });
                    if (resp.ok) {
                      setDesigns(prev => prev.filter(d => d.id !== selectedDesign.id));
                      setSelectedDesign(null);
                    }
                  }}
                >
                  Remove from Board
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
