'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Procreate-mapped touch gesture controller for the Studio canvas shell.
 *
 * Gesture map:
 * - 2-finger tap        → undo
 * - 3-finger tap        → redo
 * - 3-finger swipe down → copy/paste menu
 * - 3-finger scrub      → clear current layer request
 * - 4-finger tap        → full-screen canvas toggle
 * - pinch               → zoom canvas view
 * - 2-finger rotate     → rotate canvas view only
 * - 2-finger flick      → snap canvas view to fit screen
 * - long press          → color picker / eyedropper
 * - wheel               → desktop zoom
 * - middle-click drag   → desktop pan
 *
 * The hook only emits named callbacks. Product behavior stays in Studio shell
 * components so gestures remain testable and do not silently mutate artwork.
 */

interface GestureCallbacks {
  onZoom: (scale: number) => void;
  onPan: (pan: { x: number; y: number }) => void;
  onUndo: () => void;
  onRedo: () => void;
  onLongPress: () => void;
  onDoubleTap: () => void;
  onRotate?: (rotationDegrees: number) => void;
  onFitToScreen?: () => void;
  onCopyPasteMenu?: () => void;
  onClearLayer?: () => void;
  onToggleFullScreen?: () => void;
}

interface GestureState {
  scale: number;
  pan: { x: number; y: number };
  rotation?: number;
}

type Point = { x: number; y: number };

const TAP_MAX_MS = 280;
const MOVE_TOLERANCE_PX = 12;
const LONG_PRESS_MS = 500;
const TWO_FINGER_FLICK_PX_PER_MS = 0.85;
const THREE_FINGER_SWIPE_DOWN_PX = 64;
const THREE_FINGER_SCRUB_PX = 95;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function clampScale(scale: number) {
  return Math.min(5, Math.max(0.35, scale));
}

function touchPoint(touch: Touch): Point {
  return { x: touch.clientX, y: touch.clientY };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function angleBetween(a: Point, b: Point) {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
}

function centroid(touches: TouchList): Point {
  const pts = Array.from(touches).map(touchPoint);
  const total = pts.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
  return { x: total.x / pts.length, y: total.y / pts.length };
}

export function useCanvasGestures(
  containerRef: RefObject<HTMLElement | null>,
  state: GestureState,
  callbacks: GestureCallbacks,
) {
  const stateRef = useRef(state);
  stateRef.current = state;

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const attach = useCallback(() => {
    const el = containerRef.current;
    if (!el) return () => {};

    let touchCount = 0;
    let touchStartTime = 0;
    let touchStartCentroid: Point | null = null;
    let lastCentroid: Point | null = null;
    let lastMoveTime = 0;
    let movedBeyondTap = false;

    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let panAnchor: Point = { x: 0, y: 0 };
    let rotateStartAngle = 0;
    let rotateStartRotation = 0;

    let threeFingerMinX = 0;
    let threeFingerMaxX = 0;
    let threeFingerMaxY = 0;

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressPointerId: number | null = null;
    let longPressFired = false;
    let lastTapTime = 0;

    let middleDragging = false;
    let middleStart: Point = { x: 0, y: 0 };
    let middlePanStart: Point = { x: 0, y: 0 };

    function clearLongPress() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressPointerId = null;
    }

    function resetTouchTracking(e: TouchEvent) {
      touchCount = e.touches.length;
      touchStartTime = Date.now();
      touchStartCentroid = e.touches.length ? centroid(e.touches) : null;
      lastCentroid = touchStartCentroid;
      lastMoveTime = touchStartTime;
      movedBeyondTap = false;

      if (touchStartCentroid) {
        threeFingerMinX = touchStartCentroid.x;
        threeFingerMaxX = touchStartCentroid.x;
        threeFingerMaxY = touchStartCentroid.y;
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      clearLongPress();
      longPressFired = false;
      longPressPointerId = e.pointerId;
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        callbacksRef.current.onLongPress();
      }, LONG_PRESS_MS);
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerId === longPressPointerId) clearLongPress();
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerId === longPressPointerId) clearLongPress();
    }

    function onTouchStart(e: TouchEvent) {
      if (isEditableTarget(e.target)) return;
      resetTouchTracking(e);

      if (e.touches.length === 2) {
        const p0 = touchPoint(e.touches[0]);
        const p1 = touchPoint(e.touches[1]);
        pinchStartDist = distance(p0, p1);
        pinchStartScale = stateRef.current.scale;
        rotateStartAngle = angleBetween(p0, p1);
        rotateStartRotation = stateRef.current.rotation ?? 0;
        const m = midpoint(p0, p1);
        panAnchor = {
          x: m.x - stateRef.current.pan.x,
          y: m.y - stateRef.current.pan.y,
        };
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (isEditableTarget(e.target)) return;
      clearLongPress();
      if (!touchStartCentroid || e.touches.length === 0) return;

      const now = Date.now();
      const currentCentroid = centroid(e.touches);
      const totalMove = distance(touchStartCentroid, currentCentroid);
      if (totalMove > MOVE_TOLERANCE_PX) movedBeyondTap = true;

      if (e.touches.length === 2) {
        e.preventDefault();
        const p0 = touchPoint(e.touches[0]);
        const p1 = touchPoint(e.touches[1]);
        const d = distance(p0, p1);
        const m = midpoint(p0, p1);
        const nextScale = pinchStartDist > 0
          ? clampScale((d / pinchStartDist) * pinchStartScale)
          : stateRef.current.scale;
        
        callbacksRef.current.onZoom(nextScale);
        callbacksRef.current.onPan({
          x: m.x - panAnchor.x,
          y: m.y - panAnchor.y,
        });

        if (callbacksRef.current.onRotate) {
          callbacksRef.current.onRotate(rotateStartRotation + angleBetween(p0, p1) - rotateStartAngle);
        }
      }

      if (e.touches.length === 3) {
        e.preventDefault();
        threeFingerMinX = Math.min(threeFingerMinX, currentCentroid.x);
        threeFingerMaxX = Math.max(threeFingerMaxX, currentCentroid.x);
        threeFingerMaxY = Math.max(threeFingerMaxY, currentCentroid.y);
      }

      lastCentroid = currentCentroid;
      lastMoveTime = now;
    }

    function onTouchEnd(e: TouchEvent) {
      clearLongPress();
      if (e.touches.length > 0) return;

      const endedAt = Date.now();
      const duration = endedAt - touchStartTime;
      const start = touchStartCentroid;
      const last = lastCentroid;
      if (!start || !last || longPressFired) return;

      const dx = last.x - start.x;
      const dy = last.y - start.y;
      const totalMove = distance(start, last);
      const quickTap = duration <= TAP_MAX_MS && totalMove <= MOVE_TOLERANCE_PX;

      if (touchCount === 4 && quickTap) {
        callbacksRef.current.onToggleFullScreen?.();
        return;
      }

      if (touchCount === 3) {
        const horizontalTravel = threeFingerMaxX - threeFingerMinX;
        const verticalTravel = threeFingerMaxY - start.y;

        if (quickTap) {
          callbacksRef.current.onRedo();
          return;
        }

        if (verticalTravel >= THREE_FINGER_SWIPE_DOWN_PX && Math.abs(dx) < verticalTravel * 0.75) {
          callbacksRef.current.onCopyPasteMenu?.();
          return;
        }

        if (horizontalTravel >= THREE_FINGER_SCRUB_PX && Math.abs(dy) < 52) {
          callbacksRef.current.onClearLayer?.();
          return;
        }
      }

      if (touchCount === 2) {
        if (quickTap) {
          callbacksRef.current.onUndo();
          return;
        }

        const elapsedSinceLastMove = Math.max(1, endedAt - lastMoveTime);
        const velocity = totalMove / Math.max(1, duration || elapsedSinceLastMove);
        if (velocity >= TWO_FINGER_FLICK_PX_PER_MS || totalMove > 180) {
          callbacksRef.current.onFitToScreen?.();
          return;
        }
      }

      if (touchCount === 1 && quickTap) {
        const now = Date.now();
        if (now - lastTapTime < 300) {
          callbacksRef.current.onDoubleTap();
          lastTapTime = 0;
        } else {
          lastTapTime = now;
        }
      }
    }

    function onWheel(e: WheelEvent) {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      callbacksRef.current.onZoom(clampScale(stateRef.current.scale * zoomFactor));
    }

    let spacePressed = false;
    let spaceDragging = false;
    let rightDragging = false;
    let dragStart: Point = { x: 0, y: 0 };
    let dragPanStart: Point = { x: 0, y: 0 };

    function onMouseDown(e: MouseEvent) {
      if (isEditableTarget(e.target)) return;
      // Middle click (1) OR Space+Left (0) OR Right click (2)
      if (e.button === 1 || (e.button === 0 && spacePressed) || e.button === 2) {
        e.preventDefault();
        if (e.button === 0) spaceDragging = true;
        if (e.button === 2) rightDragging = true;
        if (e.button === 1) middleDragging = true;
        
        dragStart = { x: e.clientX, y: e.clientY };
        dragPanStart = { x: stateRef.current.pan.x, y: stateRef.current.pan.y };
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (middleDragging || spaceDragging || rightDragging) {
        callbacksRef.current.onPan({
          x: dragPanStart.x + (e.clientX - dragStart.x),
          y: dragPanStart.y + (e.clientY - dragStart.y),
        });
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button === 1) middleDragging = false;
      if (e.button === 0) spaceDragging = false;
      if (e.button === 2) rightDragging = false;
    }

    function onContextMenu(e: MouseEvent) {
      if (rightDragging) {
        e.preventDefault();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      if (e.code === 'Space') {
        spacePressed = true;
        if (el) el.style.cursor = 'grab';
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        callbacksRef.current.onDoubleTap();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        callbacksRef.current.onZoom(clampScale(stateRef.current.scale * 1.15));
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        callbacksRef.current.onZoom(clampScale(stateRef.current.scale * 0.85));
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spacePressed = false;
        spaceDragging = false;
        if (el) el.style.cursor = 'auto';
      }
    }

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    el.style.touchAction = 'none';

    return () => {
      clearLongPress();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [containerRef]);

  useEffect(() => attach(), [attach]);
}
