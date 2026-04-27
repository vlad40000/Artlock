# Correction Report

## Corrected purpose
This package is an Antigravity control pack for finishing the current Artlock build.
It is not app source code.

## Corrected assumptions
- Primary loop is Reference -> Lock -> Delta.
- Active UX target is single-screen Studio.
- Intake is not required.
- Current architecture uses existing session/assets routes.
- Persistence is required.
- Lock model has seven sections.
- Secondary tools are allowed behind menus/drawers.

## Eliminated bad guidance
- Supabase as active implementation guidance
- `app/api/gemini/route.ts` as the single AI route
- `src/constants/prompts.ts` as required prompt file
- React useState-only / no-persistence rule
- Two-lock-only extraction
- Hard ban on Mockup, Stencil, Variants
- Required three-phase-only app structure
- Malformed brace-expansion folders

## Most useful retained ideas
- Scope guard
- Surgical delta QA
- Active image rule
- FAIL as a valid outcome
- Artist feedback routing
- Agent role discipline
- Implementation plans with agent assignments and acceptance criteria
