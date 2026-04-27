# Skill — Lock Extraction

Use this when implementing or modifying lock extraction.

## Inputs
- source asset image
- session id
- project id

## Output
Persist a seven-section lockset:

```text
Design
Style
Context
Camera
Composition
Tattoo
Placement
```

## Constraints
- Read-only analysis.
- No invention.
- Use `[X]` for unknowns.
- Do not paraphrase existing locks during edit injection.
- Do not downgrade to a two-lock contract.

## Route

```text
app/api/sessions/[sessionId]/extract-locks/route.ts
```
