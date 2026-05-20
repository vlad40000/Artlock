'use client';

import React from 'react';
import { ImagePlus, ShieldCheck, Activity, Sparkles, Layers, Download, Maximize } from 'lucide-react';
import type { DesignPhase } from '@/types/domain';

// ── Badge ─────────────────────────────────────────────────────────────────────

export function Badge({ children, tone = 'neutral' }: {
  children: React.ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue';
}) {
  const styles = {
    neutral: 'border-white/10 bg-white/[0.07] text-white/70',
    green:   'border-tls-emerald/30 bg-tls-emerald/15 text-tls-emerald',
    amber:   'border-tls-amber/30 bg-tls-amber/15 text-tls-amber',
    red:     'border-red-400/30 bg-red-400/15 text-red-200',
    blue:    'border-tls-sky/30 bg-tls-sky/15 text-tls-sky',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] bg-tls-panel border border-tls-border backdrop-blur-tls-28 shadow-tls-panel ${styles[tone]}`}>
      {children}
    </span>
  );
}

// ── IconButton ────────────────────────────────────────────────────────────────

export function IconButton({ children, active, onClick, title }: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black transition-all bg-tls-panel border border-tls-border backdrop-blur-tls-28 shadow-tls-panel ${
        active
          ? '!border-tls-amber !bg-tls-amber text-black shadow-[0_0_28px_rgba(251,191,36,0.28)]'
          : 'text-white/65 hover:bg-white/15 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// ── RadialNode ────────────────────────────────────────────────────────────────

export function RadialNode({ label, icon, angle, radius, primary, onClick }: {
  label: string;
  icon: React.ReactNode;
  angle: number;
  radius: number;
  primary?: boolean;
  onClick: () => void;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  return (
    <button
      onClick={onClick}
      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
      className={`absolute left-1/2 top-1/2 flex items-center justify-center gap-2 w-32 h-11 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl z-20 ${
        primary
          ? 'bg-tls-amber border-tls-amber text-black hover:bg-white hover:scale-110'
          : 'bg-[#2a2a2c]/90 border-white/10 text-white/80 hover:bg-white/10 backdrop-blur-md'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── PHASES ────────────────────────────────────────────────────────────────────

export const PHASES: {
  id: DesignPhase;
  code: string;
  label: string;
  kind: string;
  op: string;
  icon: React.ReactNode;
}[] = [
  { id: 'reference', code: 'REF',  label: 'Reference Board',   kind: 'intake', op: 'Extract',  icon: <ImagePlus size={16} /> },
  { id: 'extract',   code: 'LOCK', label: 'Locks Extraction',  kind: 'read',   op: 'Extract',  icon: <ShieldCheck size={16} /> },
  { id: 'surgical',  code: 'SRG',  label: 'Surgical Delta',    kind: 'edit',   op: 'Surgical', icon: <Activity size={16} /> },
  { id: 'creative',  code: 'CRT',  label: 'Creative Pivot',    kind: 'edit',   op: 'Creative', icon: <Sparkles size={16} /> },
  { id: 'variants',  code: 'VAR',  label: 'Variants',          kind: 'build',  op: 'Variant',  icon: <Layers size={16} /> },
  { id: 'stencil',   code: 'STNC', label: 'Stencil',           kind: 'build',  op: 'Stencil',  icon: <Download size={16} /> },
  { id: 'mockup',    code: 'MOCK', label: 'Mockup',             kind: 'mock',   op: 'Mockup',   icon: <Maximize size={16} /> },
];
