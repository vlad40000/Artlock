'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Procreate-mapped touch gesture controller for the workspace canvas.
 *
 * Gesture map:
 * - 1-finger drag       → no-op (reserved for mask painting)
 * - 2-finger pinch      → zoom (min 0.5, max 5)
 * - 2-finger drag       → pan
 * - 2-finger tap        → undo
 * - 3-finger tap        → redo
 * - Long press (500ms)  → radial menu
 * - Double tap           → reset zoom/pan to 1:1
 * - Scroll wheel         → zoom (desktop)
 * - Middle-click drag    → pan (desktop)
 */

interface GestureCallbacks {
  onZoom: (scale: number) => void;
  onPan: (pan: { x: number; y: number }) => void;
  onUndo: () => void;
  onRedo: () => void;
  onLongPress: () => void;
  onDoubleTap: () => void;
}

interface GestureState {
  scale: number;
  pan: { x: number; y: number };
}

export function useCanvasGestures(
  containerRef: React.RefObject<HTMLDivElement | null>,
  state: GestureState,
  callbacks: GestureCallbacks,
) {
  // Stable refs for current values to avoid re-subscribing listeners
  const stateRef = useRef(state);
  stateRef.current = state;

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const attach = useCallback(() => {
    const el = containerRef.current;
    if (!el) return () => {};

    // --- Touch gesture state ---
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let panAnchor = { x: 0, y: 0 };
    let touchCount = 0;
    let touchStartTime = 0;
    let moved = false;

    // --- Long press state ---
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressPointerId: number | null = null;
    let longPressFired = false;

    // --- Double tap state ---
    let lastTapTime = 0;

    // --- Desktop middle-click pan state ---
    let middleDragging = false;
    let middleStart = { x: 0, y: 0 };
    let middlePanStart = { x: 0, y: 0 };

    function dist(touches: TouchList) {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
    }

    function mid(touches: TouchList) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    }

    function clearLP() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressPointerId = null;
    }

    function clampScale(s: number) {
      return Math.min(5, Math.max(0.5, s));
    }

    // --- Pointer (long press) ---
    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      clearLP();
      longPressFired = false;
      longPressPointerId = e.pointerId;
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        callbacksRef.current.onLongPress();
      }, 500);
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerId === longPressPointerId) clearLP();
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerId === longPressPointerId) clearLP();
    }

    // --- Touch ---
    function onTouchStart(e: TouchEvent) {
      moved = false;
      touchCount = e.touches.length;
      touchStartTime = Date.now();

      if (e.touches.length === 2) {
        pinchStartDist = dist(e.touches);
        pinchStartScale = stateRef.current.scale;
        const m = mid(e.touches);
        panAnchor = {
          x: m.x - stateRef.current.pan.x,
          y: m.y - stateRef.current.pan.y,
        };
      }
    }

    function onTouchMove(e: TouchEvent) {
      moved = true;
      clearLP();

      if (e.touches.length === 2) {
        e.preventDefault();
        const d = dist(e.touches);
        const m = mid(e.touches);
        const nextScale = pinchStartDist > 0
          ? clampScale((d / pinchStartDist) * pinchStartScale)
          : stateRef.current.scale;

        callbacksRef.current.onZoom(nextScale);
        callbacksRef.current.onPan({
          x: m.x - panAnchor.x,
          y: m.y - panAnchor.y,
        });
      }
    }

    function onTouchEnd(e: TouchEvent) {
      clearLP();
      const duration = Date.now() - touchStartTime;

      // Ignore if moved, long duration, or long press already fired
      if (moved || duration > 280 || longPressFired) return;

      // 2-finger tap → undo
      if (touchCount === 2 && e.touches.length === 0) {
        callbacksRef.current.onUndo();
        return;
      }

      // 3-finger tap → redo
      if (touchCount === 3 && e.touches.length === 0) {
        callbacksRef.current.onRedo();
        return;
      }

      // 1-finger tap → check double tap → reset zoom/pan
      if (touchCount === 1 && e.touches.length === 0) {
        const now = Date.now();
        if (now - lastTapTime < 300) {
          callbacksRef.current.onDoubleTap();
          lastTapTime = 0;
        } else {
          lastTapTime = now;
        }
      }
    }

    // --- Desktop: scroll wheel zoom ---
    function onWheel(e: WheelEvent) {
      e.preventDefault();

      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const next = clampScale(stateRef.current.scale * zoomFactor);
      callbacksRef.current.onZoom(next);
    }

    // --- Desktop: middle-click pan ---
    function onMouseDown(e: MouseEvent) {
      if (e.button !== 1) return; // middle click only
      e.preventDefault();
      middleDragging = true;
      middleStart = { x: e.clientX, y: e.clientY };
      middlePanStart = { ...stateRef.current.pan };
    }

    function onMouseMove(e: MouseEvent) {
      if (!middleDragging) return;
      callbacksRef.current.onPan({
        x: middlePanStart.x + (e.clientX - middleStart.x),
        y: middlePanStart.y + (e.clientY - middleStart.y),
      });
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button === 1) middleDragging = false;
    }

    // --- Keyboard shortcuts ---
    function onKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + 0 → reset zoom
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        callbacksRef.current.onDoubleTap();
        return;
      }

      // Cmd/Ctrl + = → zoom in
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        callbacksRef.current.onZoom(clampScale(stateRef.current.scale * 1.15));
        return;
      }

      // Cmd/Ctrl + - → zoom out
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        callbacksRef.current.onZoom(clampScale(stateRef.current.scale * 0.85));
        return;
      }
    }

    // --- Subscribe ---
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    el.style.touchAction = 'none';

    return () => {
      clearLP();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [containerRef]);

  useEffect(() => {
    return attach();
  }, [attach]);
}
