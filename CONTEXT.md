# CONTEXT.md - Artlock File Map (Studio-First)

## Product Target
Single-screen, Procreate-inspired Artlock Studio.
Primary loop: `Reference -> Lock -> Delta`.

## Canonical Routes
* `app/studio/page.tsx`: Landing page / Empty Canvas Studio.
* `app/studio/[sessionId]/page.tsx`: Active session workspace.

## Legacy & Compatibility
* `app/page.tsx`: Redirects to `/studio`.
* `app/workspace/[sessionId]/page.tsx`: Redirects to Studio UI; supports `?ui=legacy` for debugging.
* `app/intake/page.tsx`: Legacy setup wizard (fallback only).

## Primary Studio Components
* `components/studio/studio-client.tsx`: Main Studio state manager and event handler.
* `components/studio/studio-shell.tsx`: Root UI layout for the Studio.
* `components/studio/studio-command-strip.tsx`: Context-aware action bar.
* `components/studio/studio-sidebar.tsx`: Operation selector, masking tools, viewport controls, and run actions.
* `components/studio/drawers/references-drawer.tsx`: Project reference management.
* `components/studio/drawers/layers-drawer.tsx`: Revision stack for reference/base/output history and approval actions.
* `components/studio/drawers/locks-drawer.tsx`: Active seven-section lock management.

## Canvas & Mask Utilities
* `components/artlock/editor/canvas-stage.tsx`: Main canvas renderer and viewport surface.
* `components/artlock/editor/input/policy.ts`: Shared pointer policy for pen/touch/mouse routing and palm rejection.
* `components/artlock/editor/input/normalize.ts`: Shared pointer normalization for canvas and mask coordinates.
* `components/artlock/editor/history/useUndoHistory.ts`: Undo/redo history for completed canvas and mask actions.
* `components/artlock/editor/selection/selection.ts`: Lasso polygon to raster selection mask conversion.
* `components/artlock/editor/selection/selectionOps.ts`: Selection combine / clear / feather utilities.
* `components/artlock/editor/layers/alphaLock.ts`: Alpha-lock drawing behavior.
* `components/artlock/editor/layers/layerOps.ts`: Duplicate and merge-down helpers.
* `components/studio/shared/mask-canvas.tsx`: Shared Studio mask drawing surface.

## Image Utilities
* `lib/image/delta-overlay.ts`: Delta-only transparent overlay generation.
* `lib/image/mask-patch.ts`: Mask bbox computation, crop, full-size patch layer creation, and bake-into-base utilities.
* `lib/image/server-mask-drift.ts`: Route-side validation that rejects surgical edits drifting outside the provided mask.

## Core Logic & Persistence
* `lib/server/lock.ts`: Atomic lock extraction and persistence.
* `lib/server/session-detail.ts`: Session hydration and context resolution.
* `lib/ai/gemini.ts`: AI bridge with retry/timeout behavior.
* `lib/ai/prompt-contracts/`: Source of truth for AI instructions.

## Active Studio API Routes (wired in current UI flow)
* `app/api/sessions/[sessionId]/extract-locks/route.ts`: Initial lock extraction.
* `app/api/sessions/[sessionId]/surgical-edit/route.ts`: Targeted image edits.
* `app/api/sessions/[sessionId]/creative-delta/route.ts`: High-variance creative edits.
* `app/api/sessions/[sessionId]/qa/route.ts`: Drift check against the lock set.
* `app/api/sessions/[sessionId]/variant-sheet/route.ts`: Flash sheet variant generation.
* `app/api/sessions/[sessionId]/approve-edit/route.ts`: Approve an edit run.
* `app/api/sessions/[sessionId]/update-reference/route.ts`: Switch the session reference.
* `app/api/sessions/[sessionId]/locks/route.ts`: Read or override locks.
* `app/api/sessions/[sessionId]/relock/route.ts`: Re-extract locks from the approved base.
* `app/api/sessions/[sessionId]/make-base/route.ts`: Promote output to the current session base.

## Present In Tree But Not Active In Current Studio Flow
* `app/api/sessions/[sessionId]/prompt-locks/`: Directory scaffold only; not wired in Studio.
* `app/api/sessions/[sessionId]/pose-delta/`: Directory scaffold only; not wired in Studio.
* `app/api/sessions/[sessionId]/stencil/`: Directory scaffold only; not wired in Studio.
* `app/api/sessions/[sessionId]/turnaround/`: Directory scaffold only; not wired in Studio.
* `mockup`: Not present as an active session route and not wired in current Studio UI.

## Current Status (2026-04-27)
* **Studio**: Primary interface is `/studio`.
* **Auth**: Custom scrypt auth via Neon Postgres.
* **Storage**: Vercel Blob with client-side direct upload.
* **AI**: Gemini via `@google/genai`.
* **No Supabase**: Neon is the primary metadata store.
* **Seven-Section Locks**: Essential for high-precision artist control.
* **Canvas-First**: Users are never forced into a wizard/setup flow.
* **Layers Drawer**: Acts as a revision stack, not a freeform compositor.
