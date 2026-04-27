# Artlock - Studio-First AI Tattoo Workflow

Artlock is a Studio-first tattoo workflow app built around one working loop:

`Reference -> Lock -> Delta`

The primary entry is `/studio`, not Intake. The active build is a single-screen workspace where artists add a reference, extract a seven-section lock, run bounded edits, approve a revision, relock from the approved base, and continue.

## Current Studio Flow
1. Add or select a reference image.
2. Run `extract-locks`.
3. Choose an active operation from the Studio shell: `Surgical`, `Creative`, `Variant`, or `QA`.
4. Review outputs in the Layers drawer, which acts as a revision stack.
5. Approve a run, relock from the latest approved base, or save the current asset to device.

## Active Session API Routes
- `extract-locks`
- `surgical-edit`
- `creative-delta`
- `qa`
- `variant-sheet`
- `approve-edit`
- `update-reference`
- `locks`
- `relock`
- `make-base`

## Current Limits
- Mockup is not wired in the current Studio UI or active route map.
- Export is currently a client-side save flow for the active asset; PSD/PDF are not implemented.
- Additional session folders such as `prompt-locks`, `pose-delta`, `stencil`, and `turnaround` exist in the tree but are not part of the active Studio workflow.

## Architecture Notes
- Next.js App Router
- Neon Postgres for workflow metadata
- Vercel Blob for stored image binaries
- Prompt contracts in `lib/ai/prompt-contracts/*`
- Shared canvas/mask behavior built around:
  `components/artlock/editor/input/policy.ts`,
  `components/artlock/editor/input/normalize.ts`,
  `components/artlock/editor/history/useUndoHistory.ts`,
  `components/studio/shared/mask-canvas.tsx`
- Route-side mask drift validation in `lib/image/server-mask-drift.ts`

Artlock is built for tattoo production control, not general-purpose image editing.
