# GEMINI.md — Antigravity Behavior Rules

## Before implementation
Read these files first:

1. `AGENTS.md`
2. `WORKFLOW_STATE.md`
3. `.agents/rules/ARTLOCK_SINGLE_SCREEN.md`
4. `.agents/rules/ARTLOCK_SCOPE.md`
5. `.agents/rules/ARTLOCK_MODEL_SPEC.md`
6. `CONTEXT.md`

Then inspect the current repository tree before changing files.

## Required plan format
Every plan must state:

```text
Objective:
Patch scope:
Files touched:
Agent count:
Agent assignments:
Acceptance criteria:
Stop conditions:
Verification:
```

## Agent assignment rule
Plans must identify which agent handles each part and how many agents are involved.

Recommended roles:

- Product Guard
- Studio UX Engineer
- Workflow/API Engineer
- Lock QA
- Verifier

## Build behavior
- One scoped patch per pass.
- Multiple files may be touched only when they are required for one acceptance criterion.
- Prefer terminal verification over browser automation unless explicitly requested.
- Update `WORKFLOW_STATE.md` after architecture or workflow changes.
- Append major decisions to `.antigravity/decisions/log.md`.

## Do not do
- Do not introduce Supabase.
- Do not create `app/api/gemini/route.ts` as the central AI route.
- Do not use `src/constants/prompts.ts` unless the current repo actually has it.
- Do not downgrade the seven-section lock model.
- Do not rebuild the Intake flow.
- Do not remove persistence.
- Do not add CRM, billing, scheduler, consent, aftercare, admin, or marketing suite features without explicit approval.
