# WORKFLOW_STATE.md

## Current Status
- **Server-Side Mask Drift Protection**: Fixed a critical SRG failure where slight full-image drift from AI models triggered rejections. Masked surgical edits are now "clamped" server-side: pixels outside an include mask (or inside an exclude mask) are automatically restored from the original base image before final validation and upload.
- **Hybrid Semantic Masking**: Successfully pivoted from manual-only painting to a hybrid model. Users can now use voice ("mask the forearm") to define focus areas (Semantic Region Hinting).
- **Tablet & Gesture Hardening**:
  - `MaskCanvas` now uses `pointer-events: none` by default, enabling multi-touch pinch-zoom and pan gestures to pass through even when masking mode is active.
  - Full touch support added for **Command Dock** dragging.
- **Voice Engine Upgrade**: Voice commands now support structured data, allowing for "area-specific" masking (e.g., "Focus on the rose").
- **UI Improvements**:
  - Added an active **FOCUS** badge for semantic hints with a quick-clear 'X' button.
  - Renamed "Mask" to "Area" in the dock to better reflect the new semantic capabilities.
- **Auth Modernization**: Cinematic, glassmorphism Login screen with premium TLS branding.
- **Strict Type Safety**: TypeScript types now strictly enforce AI generation profiles and complex voice command structures.

## Technical Details
- `server-mask-drift.ts`: Implements `clampEditToMask` which uses `sharp` to perform pixel-perfect restoration of "locked" areas based on mask data.
- `surgical-edit/route.ts`: Integrated the clamping logic into the Phase 1B pipeline to ensure all generated artifacts are perfectly compliant with the user's mask before storage.
- `useCanvasGestures.ts`: Handles Procreate-style gestures (Undo, Redo, Zoom, Pan, etc.).
- `MaskCanvas.tsx`: Hardened for tablets; uses `pointer-events-auto` only when actively masking.
- `voice-command-parser.ts`: Enhanced regex to extract semantic subjects from masking commands.
- `studio-client.tsx`: Centralized state for `regionHint`, `maskType`, and `maskAssetId`.

## Next Steps
- **History Manager**: Fully integrate gesture callbacks with a global application state stack.
- **Cloud Persistence**: Save all dock preferences and viewport states to the user's project metadata.
- **Performance**: Monitor mask asset generation speeds and server-side clamping latency on high-resolution images.
