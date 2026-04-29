# WORKFLOW_STATE.md

## Current Status
### ⚠️ CRITICAL: READ PRODUCT_TRUTH.md FIRST
Every agent session MUST start by reading [PRODUCT_TRUTH.md](file:///c:/Users/bradv/Downloads/Artlock-main (34)/PRODUCT_TRUTH.md). No architectural or UI decisions should be made that conflict with the principles defined in that document.

- **Multi-Reference Support (Gemini 3.1)**: Upgraded the surgical and creative pipelines to support up to 14 reference assets. The system handles categorized design/style mixing with automated Identity/Detail locks.
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
- **Full History Cloud Persistence**: Finalized synchronization of the local `PieceState` history (`past` and `future` stacks) with the server database. Users can now resume sessions on different devices with their full undo/redo history intact.
- **Redundant Folder Identification**: Identified `Artlock-main/` as a redundant nested directory from a zip extraction. It contains no project files and is currently locked by a system process (likely an IDE or LSP). Documentation links have been updated to point to the root `PRODUCT_TRUTH.md`.

## Technical Details

- `useHistory.ts`: Generic state snapshot manager for the studio piece state. Supports functional updates.
- `StudioClient.tsx`: Centralized phase gating, history integration, browser fullscreen management, and the new Phase Sidebar rendering.
- `globals.css`: Defines the new high-contrast aesthetic tokens.

- **Multi-Reference UI**: Successfully wired the `activeReferenceIds` state to the Studio UI drawers. Artists can now multi-select up to 14 references, with each asset maintaining its own title and prompt-line context in the expanded Reference Assist drawer.
- **Automated AI Mode Inference**: Moved `referenceAssistMode` and `transferMode` logic from the API layer into the Prompt Contracts. The system now automatically determines the optimal generation strategy based on the active reference set.
- **Surgical Hardening (Phase 1)**: Integrated fixes for empty mask detection, normalized dimension-aware overlays, and target-region extraction to reduce design drift.

## Next Steps

- **Performance**: Monitor mask asset generation speeds and server-side clamping latency on high-resolution images.
- **Batch Processing**: Investigate optimizing history persistence by only saving diffs if payload size becomes an issue.
- **Phase 1C Refinement**: Ensure Creative Delta variant generation remains bounded and traceable to the base image identity.
