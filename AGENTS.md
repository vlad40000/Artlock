# AGENTS.md - Artlock Antigravity Operating Rules

## Prime directive
Artlock is a focused AI workflow for tattoo artists.

Primary loop:

```text
Reference -> Lock -> Delta
```

The app must open into a single-screen, canvas-first Studio interface. Intake is not a required step.

## Active build target
Build toward:

```text
Empty canvas -> Add Reference -> Lock Design -> Surgical Delta -> Approve/Relock/Export
```

The gallery is a References drawer. Locks are a Locks drawer. Generated outputs are a Layers drawer. The bottom command strip owns the current action.

## Current architecture assumptions
Use the current Artlock app architecture:

- Next.js App Router / current project version
- Neon Postgres for persisted workflow metadata
- Vercel Blob for uploaded/generated image binaries
- Session-specific API routes under `app/api/sessions/[sessionId]/*`
- Asset routes under `app/api/assets/*`
- Prompt contracts under `lib/ai/prompt-contracts/*`
- Seven-section lock model: Design, Style, Context, Camera, Composition, Tattoo, Placement

Do not introduce Supabase. Do not collapse AI calls into one generic `app/api/gemini/route.ts`. Do not downgrade locks to two sections.

## Persistence rule
Persist:

- projects
- sessions
- assets
- locks
- edit runs
- approved outputs
- gallery state

Store images in Vercel Blob. Store Blob URLs/keys and workflow metadata in Neon.

## Scope rules
Allowed primary work:

- Add/select reference
- Extract/view/override locks
- Bounded surgical delta
- Mask/target-region edits
- Approve/relock/export
- References/Layers/Locks drawers
- Single-screen Studio route and shell

Allowed secondary tools, when they are explicitly wired and verified:

- Stencil
- Mockup
- Variants
- Export

If a tool is not wired in the current Studio UI or route map, document it as pending or disabled rather than implying it is available.

Blocked unless explicitly approved:

- CRM
- billing
- scheduler
- consent forms
- aftercare
- admin panel
- marketing kit as primary flow

## Implementation planning rule
Every implementation plan must include:

- Objective
- Patch scope
- Files touched
- How many agents are involved
- Which agent handles each part
- Acceptance criteria
- Stop conditions
- Verification commands

One scoped patch per pass. A patch may touch multiple files only when those files are required by one acceptance criterion.

## Canvas gesture rule
The Procreate-style interaction contract lives in `.agents/rules/PROCREATE_TOUCH_CONTRACT.md`. Any Studio shell, drawing surface, brush engine, drawer, or quick-menu change must preserve that contract. Canvas gestures are viewport/tool commands only unless explicitly routed through an undoable layer/edit operation.

## Non-negotiables
- Do not rebuild from scratch.
- Do not remove working routes unless replacing them with a tested equivalent.
- Do not restore Intake as the required product entry.
- Do not silently edit an old asset when a latest approved asset exists.
- Do not paraphrase lock text when passing it downstream.
- Do not auto-approve AI edits.
- FAIL is valid when drift is detected.
