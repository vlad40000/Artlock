'use client';

import { useEffect, useRef, useState } from 'react';

type VoiceCallback = ((text: string) => void) | null;

export function useVoiceController() {
  const recognitionRef = useRef<any>(null);
  const activeFieldRef = useRef<VoiceCallback>(null);
  const shouldListenRef = useRef(false);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      shouldListenRef.current = false;
      if (recognition) {
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.stop?.();
      }
    };
  }, []);

  function buildRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech recognition is not supported in this browser.');
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      if (shouldListenRef.current) {
        recognition.start();
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let liveTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim() ?? '';
        if (!text) {
          continue;
        }

        if (result.isFinal) {
          finalTranscript += `${text} `;
        } else {
          liveTranscript += `${text} `;
        }
      }

      const combinedTranscript = (finalTranscript || liveTranscript).trim();
      if (!combinedTranscript) {
        return;
      }

      setTranscript(combinedTranscript);
      if (finalTranscript.trim()) {
        activeFieldRef.current?.(finalTranscript.trim());
      }
    };

    return recognition;
  }

  function ensureRecognition() {
    const recognition = recognitionRef.current ?? buildRecognition();
    recognitionRef.current = recognition;
    return recognition;
  }

  function setActiveField(fieldId: string, onResult: (text: string) => void) {
    activeFieldRef.current = onResult;
    setActiveFieldId(fieldId);
  }

  function clearActiveField(fieldId?: string) {
    if (!fieldId || activeFieldId === fieldId) {
      activeFieldRef.current = null;
      setActiveFieldId((current) => (fieldId ? (current === fieldId ? null : current) : null));
    }
  }

  function startListening() {
    if (!activeFieldRef.current) {
      throw new Error('Focus a field before enabling the microphone.');
    }

    const recognition = ensureRecognition();
    shouldListenRef.current = true;
    setTranscript('');
    if (!isListening) {
      recognition.start();
    }
  }

  function stopListening() {
    shouldListenRef.current = false;
    recognitionRef.current?.stop?.();
  }

  function toggleListening() {
    if (shouldListenRef.current || isListening) {
      stopListening();
      return;
    }

    startListening();
  }

  return {
    transcript,
    isListening,
    activeFieldId,
    setActiveField,
    clearActiveField,
    startListening,
    stopListening,
    toggleListening,
  };
}
