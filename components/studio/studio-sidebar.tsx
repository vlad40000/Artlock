'use client';

import React from 'react';
import {
  Play,
  Sparkles,
  BadgeCheck,
  Layers,
  Lock,
  Library,
  Move,
  RotateCcw,
  Scissors,
  User,
} from 'lucide-react';

import { VoiceButton } from './voice/voice-button';
import type { VoiceStatus } from './voice/use-studio-voice';

export const operations = ['Extract', 'Surgical', 'Creative', 'Variant', 'Turnaround', 'Stencil', 'Mockup', 'QA'] as const;
export const locks = ['design', 'style', 'context', 'camera', 'composition', 'tattoo', 'placement'] as const;
export const placements = ['Forearm', 'Upper Arm', 'Back', 'Chest', 'Shoulder', 'Thigh', 'Calf', 'Ribs', 'Hand', 'Neck'] as const;

export type Placement = (typeof placements)[number];

export type Operation = (typeof operations)[number];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Pill({
  active,
  children,
  onClick,
  disabled,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx('sc-pill', active && 'is-active')}
      title={title}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="sc-section">
      <div className="sc-section__label">{title}</div>
      {children}
    </section>
  );
}

export function operationAction(operation: Operation) {
  switch (operation) {
    case 'Extract':
      return 'Extract Phase 1a Locks';
    case 'Surgical':
      return 'Run Edit';
    case 'Creative':
      return 'Run Creative Delta';
    case 'Variant':
      return 'Generate Variant Sheet';
    case 'Turnaround':
      return 'Generate Model Sheet';
    case 'Stencil':
      return 'Extract Stencil Linework';
    case 'Mockup':
      return 'Place on Skin Mockup';
    case 'QA':
      return 'Run Drift Check';
    default:
      return 'Run';
  }
}

function operationIcon(operation: Operation) {
  const size = 15;
  switch (operation) {
    case 'Extract':
      return <Lock size={size} />;
    case 'Creative':
      return <Sparkles size={size} />;
    case 'Variant':
      return <Layers size={size} />;
    case 'Turnaround':
      return <RotateCcw size={size} />;
    case 'Stencil':
      return <Scissors size={size} />;
    case 'Mockup':
      return <User size={size} />;
    case 'QA':
      return <BadgeCheck size={size} />;
    default:
      return <Play size={size} />;
  }
}

export interface StudioSidebarProps {
  operation: Operation;
  setOperation: (op: Operation) => void;
  request: string;
  setRequest: (v: string) => void;
  voiceStatus: VoiceStatus;
  onMicToggle: () => void;
  onRun: () => void;
  activeLocks: Set<string>;
  statusMessage: string;
  busy?: boolean;
  onResetViewport: () => void;
}





export function StudioSidebar({
  operation,
  setOperation,
  request,
  setRequest,
  voiceStatus,
  onMicToggle,
  onRun,
  activeLocks,
  statusMessage,
  busy,
  onResetViewport,
}: StudioSidebarProps) {




  return (
    <aside className="sc-panel">
      {/* Header */}
      <div className="sc-header">
        <div className="sc-header__row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div className="sc-header__title">Tattoo Lock System</div>
          <button 
            type="button" 
            className="sc-board-link"
            onClick={() => window.location.href = '/studio'}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              background: 'var(--surface-glass)', 
              border: '1px solid var(--border)', 
              borderRadius: '6px', 
              padding: '4px 8px', 
              fontSize: '11px', 
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <Library size={12} />
            <span>Board</span>
          </button>
        </div>
        <div className="sc-header__sub">Phase 1a — Studio Controls</div>
      </div>

      {/* Operation */}
      <Section title="Operation">
        <div className="sc-pills">
          {operations.map((item) => {
            const tooltips: Record<Operation, string> = {
              Extract: 'Phase 1a: Verbatim lock extraction from reference image',
              Surgical: 'Phase 1b: Precise region-based edits and additions',
              Creative: 'Phase 1c: High-variance transformations and revisions',
              Variant: 'Phase 3: Generate a locked flash sheet with linework, black and grey, and color/blackwork panels',
              Turnaround: 'Phase 2c: Generate alternate anatomical views of the locked design',
              Stencil: 'Phase 4a: Extract clean, high-contrast linework for physical stencil production',
              Mockup: 'Phase 5: Visualize the design on realistic human skin and anatomy',
              QA: 'Drift Check: Verify AI adherence to approved design',
            };
            return (
              <Pill 
                key={item} 
                active={operation === item} 
                onClick={() => setOperation(item)} 
                disabled={busy}
                title={tooltips[item]}
              >
                {item === 'Extract' ? 'Phase 1a' : item}
              </Pill>
            );
          })}
        </div>
      </Section>

      <Section title="Viewport">
        <div className="sc-inline-actions">
          <button type="button" className="sc-tool-action" onClick={onResetViewport} disabled={busy} title="Reset zoom and pan">
            <Move size={14} />
            Reset
          </button>
        </div>
      </Section>
      <Section title="Locks">
        <div className="sc-section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="sc-badge sc-badge--phase">Phase 1a</span>
          <span className="sc-badge sc-badge--count">{activeLocks.size} Active</span>
        </div>
        <div className="sc-lock-strip" title="Active семь-section locks protecting your design">
          {locks.map((lock) => (
            <span
              key={lock}
              className={cx('sc-lock-badge', activeLocks.has(lock) && 'is-active')}
            >
              {lock}
            </span>
          ))}
        </div>
      </Section>

      {/* Client Request + Actions */}
      <div className="sc-request">
        <div className="sc-request__label">Client Request</div>
        <div className="sc-request__input-row">
          <textarea
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            disabled={busy}
            title="Voice dictation or manual request input"
          />
          <VoiceButton status={voiceStatus} onToggle={onMicToggle} />
        </div>

        <button
          type="button"
          onClick={onRun}
          disabled={busy}
          className="sc-run-btn"
          title={`Execute the ${operation} operation`}
        >
          {operationIcon(operation)}
          {operationAction(operation)}
        </button>
        <div className="sc-status">{statusMessage}</div>
      </div>
    </aside>
  );
}
