# PROCREATE_TOUCH_CONTRACT.md - Canvas Gesture and Spatial UX Contract

## Purpose
Artlock Studio must behave like a canvas-first, touch-first editor. The artwork stays primary. Interface chrome appears only as compact overlays or drawer panels and must never become the main focus.

## Gesture contract
Implement these gestures at the canvas shell level unless the active tool explicitly owns the pointer stream:

- 2-finger tap: Undo the last completed input session.
- 3-finger tap: Redo the last undone completed input session.
- 3-finger swipe down: Open a compact copy/paste actions panel. Do not cover the artwork center.
- 3-finger scrub: Clear the current layer only after an explicit confirmation or undoable checkpoint.
- 4-finger tap: Toggle full-screen canvas mode by hiding Studio chrome.
- Pinch: Zoom the canvas.
- Two-finger rotate: Rotate the canvas view only, not the saved artwork.
- 2-finger flick after pan/pinch: Snap canvas view to fit screen.
- Long-press on canvas: Open color picker / eyedropper. Do not open the old radial menu.
- 2-finger tap on a layer thumbnail: Open the on-canvas opacity slider for that layer.

## Spatial mapping contract
- Right-side cluster: Brush, Smudge, Eraser, Layers, active Color indicator.
- Left-side cluster: Brush Size slider, Opacity slider, compact Quick Menu trigger.
- Top-left controls: Gallery, Actions, Adjustments, Selection, Transform.
- References must open as a floating detached panel or right drawer, not as a route jump.
- Locks, References, Layers, and Export are panel/action surfaces. They are not center-radial items.

## Interaction rules
- Four-finger full-screen mode must keep one restore affordance available.
- Run actions belong to the phase-aware bottom command strip or the phase drawer CTA.
- Color Drop is only valid when a closed region is detected. Threshold changes by horizontal drag while holding.
- Alpha Lock restricts brush/edit changes to existing pixels and must be undoable as a state change.
- Canvas zoom/rotation/pan are viewport transforms only and must not mutate image data or lock data.

## Architecture rules
- Gesture logic belongs in `hooks/useCanvasGestures.ts` or a dedicated gesture hook.
- Studio shell wiring belongs in `components/studio/studio-client.tsx`.
- Do not reintroduce `.tls-radial-ring` as a product interaction.
- Gesture actions must call named callbacks; do not bury product behavior inside raw event handlers.
- Unsupported gestures must surface as safe status messages, not fake completed actions.

## Acceptance criteria
- 2-finger tap, 3-finger tap, 4-finger tap, pinch zoom, rotate, long-press color picker, and 2-finger snap are wired through named callbacks.
- Full-screen toggle hides top bar, drawers, and bottom command while preserving a restore control.
- Gesture callbacks do not run during text input typing.
- Build passes after the hook and shell changes.
