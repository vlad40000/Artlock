# RELEASE_HANDOFF.md - Artlock Studio

## Release Status
Studio-first workspace with shared canvas/mask input hardening and current-route docs aligned to the repo state on 2026-04-27.

## Route Map
* `/` -> Redirects to `/studio`
* `/studio` -> Opens empty canvas-first Studio
* `/studio/[sessionId]` -> Opens active Studio session
* `/workspace/[sessionId]` -> Legacy/deep-link compatible route
* `/intake` -> Fallback legacy setup wizard

## Core Studio Flow
1. **Add Reference**: Drag/drop or upload a tattoo reference image.
2. **Lock Design**: Extract seven-section AI locks.
3. **Run an Operation**: Current wired operations are Surgical, Creative, Variant, and QA.
4. **Review Revisions**: The Layers drawer is a revision stack of reference/base/output history.
5. **Approve**: Finalize an edit run as the latest approved base.
6. **Relock**: Extract new locks from the latest approved design to continue the loop.
7. **Save to Device**: Current Studio save flow downloads the active asset. PSD/PDF remain pending.

## Active Session APIs
* `extract-locks`
* `surgical-edit`
* `creative-delta`
* `qa`
* `variant-sheet`
* `approve-edit`
* `update-reference`
* `locks`
* `relock`
* `make-base`

## Drawer Model
* **References Drawer**: Uploaded and selectable project references.
* **Layers Drawer**: Reference/base/output revisions and approval actions.
* **Locks Drawer**: Real-time view and override of active seven-section locks.

## Hardening Notes
* **Shared Pointer Stack**: Canvas and mask interactions use shared pointer policy, normalization, and undo history utilities.
* **Route-Side Mask Drift Guard**: `app/api/sessions/[sessionId]/surgical-edit/route.ts` validates mask drift through `lib/image/server-mask-drift.ts`.
* **Safe API Errors**: Shared error helpers avoid leaking server internals.
* **AI Resilience**: Gemini requests run through server-side helpers with retry/timeout behavior.

## Product Invariants
* **No Supabase**: Neon remains the metadata store.
* **No generic `/api/gemini`**: AI logic stays session-scoped.
* **Seven-Section Lock Model**: Do not collapse it.
* **Canvas-First**: Intake remains optional.
* **Focused Workflow**: No CRM, billing, or admin-panel expansion in the core flow.

## Known Risks & Limitations
* **Pending / Unwired Tools**: Mockup is not wired in the current Studio UI or route map. `prompt-locks`, `pose-delta`, `stencil`, and `turnaround` exist only as dormant session folders.
* **Save Flow Scope**: PNG/JPEG save is available from the client. PSD/PDF actions currently report "coming soon."
* **Verification Truth**: Command outcomes must be taken from the latest run, not assumed from older handoff text.

## Verification Commands
* `cmd /c npm run typecheck`
* `cmd /c npm run build`
* `cmd /c npm run lint`
* No `test` script is defined in `package.json` as of 2026-04-27.

## Latest Verification Outcomes (2026-04-27)
* `cmd /c npm run typecheck` -> Passed.
* `cmd /c npm run build` -> Initial sandboxed run hit `Error: spawn EPERM` after compile; rerun outside the sandbox completed successfully and produced the current route manifest.
* `cmd /c npm run lint` -> Failed immediately with `Invalid project directory provided, no such directory: C:\Users\bradv\Downloads\Artlock-main\lint`.
* `test` -> Not run because no `test` script is defined in `package.json`.
