'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * A generic hook for managing a state history stack (Undo/Redo).
 */
export function useHistory<T>(initialState: T, maxHistory = 50) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<T[]>([initialState]);

  // Use a ref to store the latest state to avoid closure staleness in callbacks
  const historyRef = useRef(history);
  historyRef.current = history;
  const indexRef = useRef(index);
  indexRef.current = index;

  const push = useCallback((nextState: T | ((prev: T) => T)) => {
    const currentHistory = historyRef.current;
    const currentIndex = indexRef.current;
    const prevState = currentHistory[currentIndex];
    
    const state = typeof nextState === 'function' 
      ? (nextState as (prev: T) => T)(prevState) 
      : nextState;

    // Check if the state is actually different from the current one to avoid redundant snapshots
    if (JSON.stringify(state) === JSON.stringify(prevState)) {
      return;
    }

    const nextHistory = currentHistory.slice(0, currentIndex + 1);
    nextHistory.push(state);

    if (nextHistory.length > maxHistory) {
      nextHistory.shift();
      setHistory([...nextHistory]);
      setIndex(nextHistory.length - 1);
    } else {
      setHistory(nextHistory);
      setIndex(nextHistory.length - 1);
    }
  }, [maxHistory]);

  const undo = useCallback((): T | null => {
    const currentIndex = indexRef.current;
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setIndex(nextIndex);
      return historyRef.current[nextIndex];
    }
    return null;
  }, []);

  const redo = useCallback((): T | null => {
    const currentHistory = historyRef.current;
    const currentIndex = indexRef.current;
    if (currentIndex < currentHistory.length - 1) {
      const nextIndex = currentIndex + 1;
      setIndex(nextIndex);
      return currentHistory[nextIndex];
    }
    return null;
  }, []);

  const reset = useCallback((state: T) => {
    setHistory([state]);
    setIndex(0);
  }, []);

  return {
    current: history[index],
    push,
    undo,
    redo,
    reset,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    history,
    index,
  };
}
