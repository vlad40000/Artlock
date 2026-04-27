'use client';

/**
 * use-studio-voice.ts - Studio voice dictation hook with command parsing.
 *
 * Wraps the Web Speech API for browser dictation. Transcripts are parsed
 * through the deterministic voice command parser. Voice can fill fields
 * and switch controls but NEVER auto-runs destructive actions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseVoiceCommand, type VoiceCommand } from './voice-command-parser';

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported' | 'denied';

export interface UseStudioVoiceOptions {
  onCommand?: (command: VoiceCommand) => void;
  onCommands?: (commands: VoiceCommand[]) => void;
  onTranscript?: (text: string) => void;
  onStatusChange?: (status: VoiceStatus) => void;
}

export function useStudioVoice(options: UseStudioVoiceOptions = {}) {
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setStatus('unsupported');
    }

    return () => {
      shouldListenRef.current = false;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        try { recognition.stop(); } catch (_) { /* noop */ }
      }
    };
  }, []);

  const updateStatus = useCallback((next: VoiceStatus) => {
    setStatus(next);
    optionsRef.current.onStatusChange?.(next);
  }, []);

  function buildRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try { recognition.start(); } catch (_) { /* noop */ }
      } else {
        setStatus((prev) => (prev === 'listening' ? 'idle' : prev));
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        updateStatus('denied');
      } else if (event.error !== 'no-speech') {
        updateStatus('error');
      }
      shouldListenRef.current = false;
    };

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript?.trim() ?? '';
        if (!text) continue;

        if (result.isFinal) {
          finalText += `${text} `;
        } else {
          interimText += `${text} `;
        }
      }

      const combined = (finalText || interimText).trim();
      if (combined) {
        setTranscript(combined);
        optionsRef.current.onTranscript?.(combined);
      }

      if (finalText.trim()) {
        const command = parseVoiceCommand(finalText.trim());
        optionsRef.current.onCommand?.(command);
      }
    };

    return recognition;
  }

  function ensureRecognition() {
    if (!recognitionRef.current) {
      recognitionRef.current = buildRecognition();
    }
    return recognitionRef.current;
  }

  const startListening = useCallback(async () => {
    if (status === 'unsupported') return;

    try {
      setTranscript('');
      shouldListenRef.current = true;
      updateStatus('listening');

      const recognition = ensureRecognition();
      if (recognition) {
        try { recognition.start(); } catch (_) { /* already started */ }
      }
    } catch (err: any) {
      console.error('Failed to start voice:', err);
      if (err.name === 'NotAllowedError') {
        updateStatus('denied');
      } else {
        updateStatus('error');
      }
    }
  }, [status, updateStatus]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    try { recognitionRef.current?.stop(); } catch (_) { /* noop */ }
  }, []);

  const toggleListening = useCallback(() => {
    if (shouldListenRef.current || status === 'listening') {
      stopListening();
    } else {
      void startListening();
    }
  }, [startListening, status, stopListening]);

  return {
    status,
    transcript,
    isListening: status === 'listening',
    isProcessing: status === 'processing',
    isSupported: status !== 'unsupported',
    startListening,
    stopListening,
    toggleListening,
    updateStatus,
  };
}
