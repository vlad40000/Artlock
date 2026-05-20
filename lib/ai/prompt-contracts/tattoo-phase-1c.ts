export const PHASE_1C_CONSTRAINED_CREATIVE_EDIT = `PHASE 1C — CONSTRAINED CREATIVE EDIT
(IMAGE-TO-IMAGE · SYMBOLIC TRANSFORMATION · ZERO-DRIFT IDENTITY)

---

## TOOL ROUTING (HARD)

- Operation type: Image-to-image GENERATION
- Base image: MANDATORY
- Locks from Phase 1A: MANDATORY
- Read-only analysis: DISALLOWED
- If identity, camera, or composition cannot be preserved → FAIL

---

## MODE

Constrained creative edit.

---

## GOAL

Apply symbolic or conceptual state transformation.
Preserve identity, structure, style, and framing.

---

## SOURCE OF TRUTH

1. Base image
2. DESIGN IDENTITY CORE
3. STYLE IDENTITY CORE
4. CAMERA CORE
5. COMPOSITION CORE

---

## CANVAS LOCK (DEFAULT — HARD)

- Aspect ratio: unchanged
- Resolution: unchanged
- Framing: unchanged
- Orientation: unchanged
- No crop / resize / padding / perspective shift / hidden recomposition
- Background: unchanged unless explicitly unlocked in DELTA

---

## CREATIVE SCOPE

ALLOWED
- Symbolic transformation
- Subject state change (tattoo / living / memory / apparition)
- Controlled material transitions
- Controlled wear, weathering, damage, polish, or activation state
- Localized emergence, glow, corrosion, fracture, decay, or similar visible transformation
- Narrative implication within one still frame

FORBIDDEN
- Identity replacement
- Proportion or anatomy change
- Style paradigm change
- Camera or composition change
- Unrelated element invention
- Multi-frame logic
- Full scene or subject redraw

---

## PHASE BOUNDARY

Creative Delta is not Surgical Edit.
If the instruction is a small localized correction, accessory add, cleanup, move, or removal → FAIL_PHASE_MISMATCH (use Surgical Edit).

---

## IDENTITY LOCK (HARD)

- Face structure preserved
- Feature placement preserved
- Proportions preserved
- Asymmetries preserved

Identity invariant — State mutable.

---

## STYLE LOCK (HARD)

- Rendering paradigm preserved
- Line and shading behavior preserved
- Contrast logic and texture policy preserved
- Palette family preserved (interpolation only, unless explicitly unlocked)
- No global restyling

---

## DESIGN / COMPOSITION LOCK (HARD)

- Silhouette preserved
- Spatial layout and focal hierarchy preserved
- Negative space preserved
- Overlap behavior preserved
- No x/y subject drift unless explicitly requested

---

## TATTOO / PLACEMENT LOCK (CONSERVATIVE)

- Preserve tattoo readability where visibly supported by source and lock text
- Preserve placement/body-flow cues only where visibly supported
- Do not invent anatomy-specific flow or skin behavior absent from the source
- If tattoo or placement fields are mostly [X], keep neutral rather than imaginative

---

## ALPHA / BACKGROUND LOCK

- Preserve alpha behavior from the base unless transformation explicitly changes background
- Do not add white matte fills
- Do not replace transparent or blank backgrounds with paper, white boxes, or gradients

---

## MASK POLICY

- If a mask is attached, treat it as the legal transformation zone
- Include mask: transform only the WHITE region
- Exclude mask: the WHITE region is locked and must not change
- Changes outside the allowed zone are forbidden

---

## CHANGE (DELTA — REQUIRED)

- One bounded symbolic transformation per pass
- A second delta is allowed only if inseparable from the first
- Visually measurable
- Localized or gradient-based
- Traceable to reference
- Any explicit unlock must remain narrow and named
- If an unlock is not named, treat that area as locked

---

## FAIL-SAFE

- Missing or invalid base image → FAIL
- Missing active lock set → FAIL
- Identity drift → FAIL
- Camera / composition drift → FAIL
- Style drift → FAIL
- Structural drift when not requested → FAIL
- Invention beyond DELTA → FAIL
- Unrequested secondary changes → FAIL

---

## OUTPUT

- One image
- Same canvas as base image
- Symbolic transformation applied
- Clear lineage to reference
- If exact compliance is not possible → FAIL`;

export const TATTOO_PHASE_1C_PROMPT = PHASE_1C_CONSTRAINED_CREATIVE_EDIT;

export const TATTOO_PHASE_1C = {
  name: 'tattoo-phase-1c-creative-delta',
  version: 'v3.0-hybrid-creative',
  buildPrompt(args: {
    designIdLock: string;
    styleIdLock: string;
    contextIdLock: string;
    cameraIdLock: string;
    compositionIdLock: string;
    tattooIdLock: string;
    placementIdLock: string;
    transformation: string;
    intensity: 'low' | 'medium' | 'high';
    exclusions?: string | null;
    references?: {
      designIdLock?: string | null;
      styleIdLock?: string | null;
    }[];
    transferInstruction?: string | null;
    transferMode?: 'none' | 'reference_transfer' | 'locked_reference_transfer';
    symmetryLock?: boolean;
    tattooMode?: boolean;
    maskMode?: 'provided' | 'none';
    maskType?: 'include' | 'exclude';
  }) {
    const exclusions = args.exclusions?.trim() ? args.exclusions.trim() : '[X]';
    const transferMode = (args.references && args.references.length > 0)
      ? (args.transferMode ?? 'none')
      : 'none';
    const symmetry = args.symmetryLock ? 'ENABLED' : 'DISABLED';
    const maskType = args.maskType ?? 'include';

    let maskLine = 'No mask provided. Keep the transformation bounded to the logical target region.';
    if (args.maskMode === 'provided') {
      maskLine = maskType === 'include'
        ? 'Binary mask attached. Apply the transformation only to the WHITE mask area.'
        : 'Binary mask attached. Apply the transformation only outside the WHITE mask area. The WHITE region is locked.';
    }

    const referenceGuidance =
      transferMode === 'none' || !args.references || args.references.length === 0
        ? ''
        : [
            'REFERENCE IMAGES:',
            ...args.references.map((ref, i) => {
              const label = i === 0 ? '[Reference Image]' : `[Reference Image #${i + 1}]`;
              return [
                `${label}:`,
                ref.designIdLock ?? '[Design ID unavailable]',
                ref.styleIdLock ?? '[Style ID unavailable]',
              ].join('\n');
            }),
            '',
            'REFERENCE TRANSFER POLICY:',
            '- Transfer mode: ' + transferMode,
            '- Borrow only the requested reference traits from the provided set.',
            '- Do not replace the base image identity, camera, composition, or overall design with references.',
            '- Use references as bounded influences, not new source images.',
            '- Requested borrowed trait: ' + (args.transferInstruction ?? args.transformation).trim(),
          ].join('\n');

    return [
      PHASE_1C_CONSTRAINED_CREATIVE_EDIT,
      '',
      'RUNTIME INPUTS:',
      '- Base image: [Base Image]',
      '- Mask handling: ' + maskLine,
      referenceGuidance || null,
      '',
      'ACTIVE LOCKSET — VERBATIM:',
      args.designIdLock,
      args.styleIdLock,
      args.contextIdLock,
      args.cameraIdLock,
      args.compositionIdLock,
      args.tattooIdLock,
      args.placementIdLock,
      '',
      'CHANGE CONTRACT:',
      'CREATIVE DELTA #1: ' + args.transformation.trim(),
      'CREATIVE DELTA #2: None',
      'STRUCTURE DELTA: none',
      'UNLOCKS: none',
      '',
      'CREATIVE CONTROLS:',
      '- Intensity: ' + args.intensity,
      '- Exclusions: ' + exclusions,
      '- Symmetry Lock: ' + symmetry,
      '',
      'PRODUCTION MODE:',
      args.tattooMode === false
        ? 'TATTOO MODE: OFF. Do not invent tattoo-placement constraints, but still preserve identity, framing, composition, and unchanged structures.'
        : 'TATTOO MODE: ON. Preserve visible tattoo readability and placement cues only where the base image and lock text visibly support them.',
    ]
      .filter((line): line is string => line !== null)
      .join('\n')
      .trim();
  },
} as const;

export default PHASE_1C_CONSTRAINED_CREATIVE_EDIT;
