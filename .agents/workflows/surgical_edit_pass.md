# Workflow — Surgical Edit Pass

## Preflight
1. Confirm active lock exists.
2. Confirm edit source is correct.
3. Confirm latest approved asset is used when present.
4. Confirm delta is bounded.
5. Confirm mask or target region if the edit is local.

## Execution
Call:

```text
app/api/sessions/[sessionId]/surgical-edit/route.ts
```

## Review
Check for:

- identity drift
- style drift
- line weight drift
- unauthorized silhouette changes
- unauthorized background changes
- wrong source image

## Approval
Do not auto-approve. User approval is required before relock or continuing from the output.
