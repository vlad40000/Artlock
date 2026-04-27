# LOCK_EXTRACTION_CONTRACT.md

## Rule
Lock extraction is read-only analysis. It must not generate, invent, beautify, or reinterpret the design.

## Lock sections
Use the seven-section Artlock lock model:

1. Design
2. Style
3. Context
4. Camera
5. Composition
6. Tattoo
7. Placement

## Unknowns
Use `[X]` when a detail cannot be confirmed from the image.

## Downstream usage
- Do not paraphrase locks when injecting into edit prompts.
- Do not drop lock sections silently.
- Do not downgrade to only Design + Style.
- Store lock output persistently.

## Relevant files/routes

```text
app/api/sessions/[sessionId]/extract-locks/route.ts
app/api/sessions/[sessionId]/locks/route.ts
lib/ai/prompt-contracts/tattoo-phase-1a.ts
lib/server/session-detail.ts
```
