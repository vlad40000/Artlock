'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity } from 'lucide-react';
import { useStudioStore } from '@/lib/stores/studio-store';
import { PHASES } from './studio-atoms';

const ALL_ACTIONS: Record<string, { label: string; icon: string }> = {
  menu:   { label: 'Quick Menu',  icon: '▦' },
  locks:  { label: 'Locks',       icon: '▣' },
  refs:   { label: 'References',  icon: '▧' },
  layers: { label: 'Deltas',      icon: '▤' },
  qa:     { label: 'Audit',       icon: '◉' },
  export: { label: 'Export',      icon: '⤓' },
  relock: { label: 'Sync Lock',   icon: '🔃' },
  mask:   { label: 'Area',        icon: '🎯' },
  undo:   { label: 'Undo',        icon: '⎌' },
  redo:   { label: 'Redo',        icon: '⎍' },
};

export interface StudioCommandDockProps {
  activeDrawer: string | null;
  setActiveDrawer: (drawer: string | null) => void;
  activePhase: string;
  runPhaseAction: () => void;
  chrome: boolean;
  setChrome: (chrome: boolean) => void;
  setShowQuickMenu: React.Dispatch<React.SetStateAction<boolean>>;
  dockPosition: { x: number; y: number };
  setDockPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  dockItems: string[];
  setDockItems: React.Dispatch<React.SetStateAction<string[]>>;
  onRunAudit?: () => void;
  onOpenExport?: () => void;
  onRelock?: () => void;
  onToggleMask?: () => void;
}

export function StudioCommandDock({
  activeDrawer, setActiveDrawer, activePhase, runPhaseAction,
  chrome, setChrome, setShowQuickMenu,
  dockPosition, setDockPosition, dockItems, setDockItems,
  onRunAudit, onOpenExport, onRelock, onToggleMask,
}: StudioCommandDockProps) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const phase = PHASES.find((item) => item.id === activePhase) || PHASES[0];
  const openDockControlsLeft = viewportWidth === null || dockPosition.x > viewportWidth / 2;
  const dockPopoverSideClass = openDockControlsLeft ? 'right-[58px]' : 'left-[58px]';
  const dockTooltipSideClass = openDockControlsLeft ? 'right-[58px]' : 'left-[58px]';

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const canRun = phase.id !== 'reference';

  const toggleDrawer = (drawer: string) => setActiveDrawer(activeDrawer === drawer ? null : drawer);

  const handleActionClick = (id: string) => {
    if (isConfiguring) return;
    switch (id) {
      case 'menu':   setShowQuickMenu(true); break;
      case 'locks':  toggleDrawer('locks'); break;
      case 'refs':   toggleDrawer('refs'); break;
      case 'layers': toggleDrawer('layers'); break;
      case 'qa':     onRunAudit?.(); break;
      case 'export': onOpenExport?.(); break;
      case 'relock': onRelock?.(); break;
      case 'mask':   onToggleMask?.(); break;
      case 'undo':   useStudioStore.getState().undo(); break;
      case 'redo':   useStudioStore.getState().redo(); break;
      default:       toggleDrawer(id);
    }
  };

  const swapAction = (index: number, newActionId: string) => {
    const next = [...dockItems];
    next[index] = newActionId;
    setDockItems(next);
  };

  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    setDockPosition({
      x: dragRef.current.initialX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.initialY + (e.clientY - dragRef.current.startY),
    });
  }, [setDockPosition]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    setDockPosition({
      x: dragRef.current.initialX + (touch.clientX - dragRef.current.startX),
      y: dragRef.current.initialY + (touch.clientY - dragRef.current.startY),
    });
  }, [setDockPosition]);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const onTouchEnd = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  }, [onTouchMove]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: dockPosition.x, initialY: dockPosition.y };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current = { startX: touch.clientX, startY: touch.clientY, initialX: dockPosition.x, initialY: dockPosition.y };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  return (
    <aside
      style={{ left: dockPosition.x, top: dockPosition.y, transform: 'translateY(-50%)' }}
      className="absolute z-50 flex flex-col items-center gap-2 rounded-full border border-white/10 bg-black/42 p-2 shadow-2xl backdrop-blur-2xl"
    >
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/45 cursor-move active:scale-95 transition-transform"
        title="Drag to reposition"
      >
        <Activity size={16} />
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
                  ? 'border-amber-300 bg-amber-300 text-black shadow-[0_0_28px_rgba(251,191,36,0.28)]'
                  : 'border-white/10 bg-white/[0.06] text-white/70 hover:bg-white hover:text-black'
              }`}
            >
              <span>{item.icon}</span>
              {!isConfiguring && (
                <span className={`pointer-events-none absolute ${dockTooltipSideClass} top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white opacity-0 shadow-xl backdrop-blur-xl transition group-hover:opacity-100`}>
                  {item.label}
                </span>
              )}
            </button>
            {isConfiguring && (
              <div className={`absolute ${dockPopoverSideClass} top-1/2 -translate-y-1/2 flex gap-1 p-1 rounded-xl bg-black/80 border border-white/10 backdrop-blur-xl z-[60] shadow-2xl`}>
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
        title={canRun ? 'Run phase action' : 'Read-only phase'}
        onClick={runPhaseAction}
        disabled={!canRun}
        className={`group relative grid h-12 w-12 place-items-center rounded-full border text-sm font-black transition-all active:scale-95 ${
          canRun
            ? 'border-white/20 bg-white text-black hover:bg-amber-300'
            : 'border-white/10 bg-white/[0.04] text-white/25'
        }`}
      >
        <span>▶</span>
        <span className={`pointer-events-none absolute ${dockTooltipSideClass} top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/75 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white opacity-0 shadow-xl backdrop-blur-xl transition group-hover:opacity-100`}>
          {canRun ? 'Run' : 'Read Only'}
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
