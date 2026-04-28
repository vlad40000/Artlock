# WORKFLOW_STATE.md

## Current Status
- Modernized Artlock Studio interface with **Always-On Command Dock**.
- **Draggable & Customizable Dock**: Reposition via Phase Badge; customize buttons in config mode.
- **Procreate-Style Canvas Gestures**: 2-finger tap (Undo), 3-finger tap (Redo), 4-finger tap (Toggle Full-screen), Pinch zoom, Rotate, and Flick-to-snap.
- **Viewport Management**: Centered artboard with persistent scale/pan/rotation state.
- **Unified Operation Logic**: Fixed `PHASES` mapping to ensure all studio operations target the correct API endpoints.
- **Type Safety Overhaul**: Implemented strict union types for `derivePresetId` parameters, ensuring compile-time validation for all operation and mode inputs.
- **Clean AI Branding**: Reverted explicit Gemini badges for a minimalist, artist-centric workspace.
- **Redundancy Cleanup**: Resolved `GenerationPresetId` union type duplication.

## Technical Details
- `hooks/useCanvasGestures.ts` handles complex touch interactions.
- `StudioClient` manages viewport transform state and merges it with UI modernization logic.
- `lib/ai/generation-profiles.ts` now enforces strict input validation for AI preset derivation.
- Build and Typecheck are passing; unit tests updated to align with strict typing.

## Next Steps
- Implement a global History Manager to fulfill Undo/Redo gesture callbacks.
- Persist `dockPosition` and `dockItems` state to user session metadata.
- Optimize canvas rendering for extremely high-resolution reference images.
