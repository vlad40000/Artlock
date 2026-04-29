# WORKFLOW_STATE.md

## Current Status
- **Server-Side Mask Drift Protection**: Hardened the protection pipeline. Fixed a logical inversion where clamping was masking AI drift from validation. Improved mask detection to handle solid alpha channels and added diagnostic logging for "CLEANED" vs "REJECTED" states.
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
- **Phase Sidebar (Left)**: Moved the phase track from the top bar to a dedicated vertical sidebar on the left.
  - Supports quick phase switching with tooltips and lock status.
  - Optimized for professional high-resolution displays.
- **Fullscreen Canvas Mode**: Implemented the Browser Fullscreen API to enable a true full-screen canvas experience across all browsers. Integrated with:
  - **Top Bar**: A "Full Screen" button in the chrome.
  - **Gestures**: Consolidated with UI "clean mode" toggling.
- **Sequential Workflow & Gating**: Implemented a strict phase-based gating system (Extraction → Surgical → Variants → Stencil). Progress is physically blocked in the UI until prerequisites (e.g., Lock extraction) are met.
- **Zustand Global History**: Migrated to a centralized `useStudioStore` managing atomic state snapshots.
  - Supports Procreate-style gestures: two-finger tap (undo), three-finger tap (redo), and three-finger scrub (clear layer).
  - Automatically snapshots AI generation results for seamless reversion.
- **High-Contrast Dark Theme**: Upgraded studio aesthetics with a Slate-950 workspace and a TLS Deep Black (#080807) artboard for professional design focus.

## Technical Details
- `useHistory.ts`: Generic state snapshot manager for the studio piece state. Supports functional updates.
- `StudioClient.tsx`: Centralized phase gating, history integration, browser fullscreen management, and the new Phase Sidebar rendering.
- `globals.css`: Defines the new high-contrast aesthetic tokens.

## Next Steps
- **Cloud Persistence**: Finalize synchronization of the local `PieceState` history with the server database for cross-device sessions.
- **Performance**: Monitor mask asset generation speeds and server-side clamping latency on high-resolution images.
