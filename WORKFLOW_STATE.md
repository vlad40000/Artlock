# WORKFLOW_STATE.md

## Current Status
- Modernized Artlock Studio interface with **Always-On Command Dock**.
- **Draggable & Customizable Dock**: Reposition via Phase Badge; customize buttons in config mode.
- **Procreate-Style Canvas Gestures**: 2-finger tap (Undo), 3-finger tap (Redo), 4-finger tap (Toggle Full-screen), Pinch zoom, Rotate, and Flick-to-snap.
- **Viewport Management**: Centered artboard with persistent scale/pan/rotation state.
- **Artist-Friendly Terminology**: Terminology like "Inspiration", "Audit Source", "Scan DNA", and "Cast PNG".
- **Enhanced Readability**: Expandable lock details in the source drawer.
- **Gesture Contract**: Registered in `.agents/rules/PROCREATE_TOUCH_CONTRACT.md` and `AGENTS.md`.

## Technical Details
- `hooks/useCanvasGestures.ts` handles complex touch interactions.
- `StudioClient` manages viewport transform state and merges it with UI modernization logic.
- Build is passing and UI is stable.

## Next Steps
- Final user walkthrough of the combined gesture + dock UX.
- Hooking up the Undo/Redo gesture callbacks to a real history manager.
