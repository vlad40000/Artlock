# WORKFLOW_STATE.md

## Current Status
- Modernized Artlock Studio interface with **Always-On Command Dock**.
- **Draggable & Customizable Dock**: Reposition via Phase Badge; customize buttons in config mode.
- **Procreate-Style Canvas Gestures**: 2-finger tap (Undo), 3-finger tap (Redo), 4-finger tap (Toggle Full-screen), Pinch zoom, Rotate, and Flick-to-snap.
- **Viewport Management**: Centered artboard with persistent scale/pan/rotation state.
- **Unified Operation Logic**: Fixed `PHASES` mapping to ensure all studio operations (Extract, Surgical, Creative, etc.) target the correct API endpoints.
- **Clean AI Branding**: Reverted explicit Gemini badges for a minimalist, artist-centric workspace.
- **Redundancy Cleanup**: Resolved `GenerationPresetId` union type duplication in the generation engine.

## Technical Details
- `hooks/useCanvasGestures.ts` handles complex touch interactions.
- `StudioClient` manages viewport transform state and merges it with UI modernization logic.
- API routing for studio actions is now fully aligned with the `Operation` type system.
- Build is passing and UI is stable.

## Next Steps
- Implement a global History Manager to fulfill Undo/Redo gesture callbacks.
- Persist `dockPosition` and `dockItems` state to user session metadata.
- Optimize canvas rendering for extremely high-resolution reference images.
