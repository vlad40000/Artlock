'use client';

import React from 'react';
import { Layers, Sparkles, CheckCircle2, MapPin, Tag } from 'lucide-react';
import type { FlashDesign, FlashTheme } from '@/types/flash';

export const STATUS_COLORS: Record<FlashDesign['status'], string> = {
  draft:    'border-white/20 bg-white/[0.04] text-white/50',
  ready:    'border-tls-emerald/30 bg-tls-emerald/10 text-tls-emerald',
  archived: 'border-white/10 bg-white/[0.02] text-white/20',
};

export function DesignCard({ design, onSelect, selected, exportMode, exportSelected }: {
  design: FlashDesign;
  onSelect: (d: FlashDesign) => void;
  selected: boolean;
  exportMode?: boolean;
  exportSelected?: boolean;
}) {
  const isHighlighted = exportMode ? exportSelected : selected;
  return (
    <button
      onClick={() => onSelect(design)}
      className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:z-10 ${
        isHighlighted
          ? 'border-tls-amber ring-4 ring-tls-amber/20 z-10'
          : exportMode
            ? 'border-white/[0.08] hover:border-tls-amber/40'
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[design.status]}`}>
        {design.status}
      </div>
      {design.is_ai_generated && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-tls-amber/20 border border-tls-amber/30 flex items-center justify-center">
          <Sparkles size={10} className="text-tls-amber" />
        </div>
      )}
      {isHighlighted && (
        <div className="absolute bottom-2 right-2">
          <CheckCircle2 size={18} className="text-tls-amber fill-tls-amber" />
        </div>
      )}
      {design.title && (
        <div className="absolute bottom-0 inset-x-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-white text-[10px] font-black uppercase tracking-widest truncate">{design.title}</div>
          {design.placement_hint && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={9} className="text-white/50" />
              <span className="text-white/50 text-[9px]">{design.placement_hint}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export function ThemePill({ theme, active, onSelect }: {
  theme: FlashTheme; active: boolean; onSelect: () => void;
}) {
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
