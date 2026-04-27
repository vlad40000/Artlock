# Skill — Surgical Edit

Use this when implementing or modifying surgical delta behavior.

## Core rule
A surgical edit is a bounded delta against a locked design.

## Preflight
- Active lock exists.
- Edit source is correct.
- Delta is specific and bounded.
- Mask or target region is used when possible.

## Edit source priority
Default source for surgical edit:

1. explicit selected editor asset
2. latest approved asset
3. current base asset
4. reference asset

Do not silently edit an old reference if a latest approved asset exists.

## Inputs

```text
delta1
delta2
regionHint
baseAssetId
maskAssetId
referenceAssetId
designFidelity
detailLoad
symmetryLock
```

## Route

```text
app/api/sessions/[sessionId]/surgical-edit/route.ts
```

## QA
Use `.agents/rules/SURGICAL_DELTA_QA.md`.
