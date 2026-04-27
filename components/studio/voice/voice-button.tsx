'use client';

/**
 * voice-button.tsx — Mic button for Studio voice input.
 *
 * States: idle, listening (red pulse), error, unsupported (hidden).
 * Uses sc-voice-btn CSS class from globals.css.
 */

import React from 'react';
import { Mic, MicOff, LoaderCircle } from 'lucide-react';
import type { VoiceStatus } from './use-studio-voice';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

interface VoiceButtonProps {
  status: VoiceStatus;
  onToggle: () => void;
}

export function VoiceButton({ status, onToggle }: VoiceButtonProps) {
  if (status === 'unsupported') return null;

  const isActive = status === 'listening';
  const isProcessing = status === 'processing';
  const isError = status === 'error' || status === 'denied';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cx(
        'sc-voice-btn',
        isActive && 'is-active',
        isProcessing && 'is-processing',
        isError && 'is-error',
      )}
      disabled={isProcessing}
      aria-label={
        isProcessing 
          ? 'Processing voice input' 
          : isActive 
          ? 'Stop voice input' 
          : isError 
          ? 'Voice error — tap to retry' 
          : 'Start voice input'
      }
      title={
        isProcessing
          ? 'Processing voice input...'
          : isError
          ? status === 'denied'
            ? 'Microphone permission denied'
            : 'Voice input error — tap to retry'
          : isActive
          ? 'Stop voice input'
          : 'Start voice input (requires microphone)'
      }
    >
      {isProcessing ? (
        <LoaderCircle size={16} className="animate-spin" />
      ) : isActive ? (
        <MicOff size={16} />
      ) : (
        <Mic size={16} />
      )}
    </button>
  );
}
