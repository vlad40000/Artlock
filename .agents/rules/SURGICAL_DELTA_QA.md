# SURGICAL_DELTA_QA.md

## Surgical delta rules
- One bounded delta per call.
- Lock injection is mandatory.
- Target region or mask should narrow the operation whenever possible.
- Latest approved asset is the default edit source when present.
- AI output is never auto-approved.

## FAIL is valid
Return or surface FAIL when:

- design identity changes without authorization
- style changes outside the requested delta
- line weight drifts
- silhouette changes unintentionally
- background changes unintentionally
- wrong source asset was edited
- output cannot satisfy the delta while preserving locks

## Approval gate
The user must explicitly approve an output before it becomes the latest approved base.

## Retry rule
On failure, narrow the target region, reduce delta scope, or request a clearer mask.
