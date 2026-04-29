export const PHASE_1C_CONSTRAINED_CREATIVE_EDIT = `PHASE 1C - CREATIVE DELTA

TOOL ROUTING - HARD
- Operation type: image-to-image creative edit or transformation.
- A Base image is mandatory.
- The active seven-lock set is mandatory.
- Read-only analysis mode is disallowed.
- If locked identity, framing, or composition cannot be preserved: FAIL.

MISSION
- Apply one bounded creative transformation.
- Preserve clear lineage to the base image.
- Expand only the requested change scope, not the whole image.

SOURCE OF TRUTH - STRICT ORDER
1) Base image
2) DESIGN ID
3) STYLE ID
4) CONTEXT ID
5) CAMERA ID
6) COMPOSITION ID
7) TATTOO ID
8) PLACEMENT ID
9) Creative delta request

CANVAS LOCK - DEFAULT HARD
- Aspect ratio: unchanged.
- Resolution: unchanged.
- Framing: unchanged.
- Orientation: unchanged.
- No crop.
- No resize.
- No padding.
- No perspective shift.
- No hidden recomposition.

ALLOWED CREATIVE SCOPE
- Bounded state change.
- Bounded symbolic or conceptual transformation.
- Controlled material or surface transition.
- Controlled wear, weathering, damage, polish, or activation state.
- Localized emergence, glow, corrosion, fracture, decay, or similar visible transformation.
- Narrative implication within one still image only.

FORBIDDEN CREATIVE SCOPE
- Identity replacement.
- Whole-scene redesign.
- Unrequested structure invention.
- Camera drift, composition drift, or style-family replacement.
- Broad background reinvention.
- Do not regenerate the subject.
- Do not rewrite the full image.
- Do not change camera, crop, scale, background, or style.

PHASE BOUNDARY
- Creative Delta is not Surgical Edit.
- If the instruction is a small localized correction, accessory add, cleanup, move, or removal: FAIL_PHASE_MISMATCH (use Surgical Edit).

IDENTITY LOCK - HARD
- Preserve primary silhouette and subject identity.
- Preserve feature placement, dominant contours, attachments, and signature forms.
- Preserve visible asymmetries unless the delta explicitly changes them.
- Do not let a creative delta become a redesign.

STYLE LOCK - HARD
- Preserve rendering paradigm.
- Preserve line and shading behavior.
- Preserve contrast logic and texture policy.
- Preserve palette family unless the delta explicitly unlocks color behavior.
- No global restyling.

TATTOO / PLACEMENT LOCK - CONSERVATIVE
- Preserve tattoo readability where visibly supported by the source and lock text.
- Preserve placement/body-flow cues only where visibly supported.
- Do not invent anatomy-specific flow or skin behavior when the source does not show it.
- If tattoo or placement fields are mostly [X], keep them neutral rather than imaginative.

CAMERA / COMPOSITION LOCK - HARD
- Preserve framing distance, viewpoint, crop, and subject scale.
- Preserve focal hierarchy, negative space, overlap behavior, and visual weight.
- No x/y subject drift unless explicitly requested.

MASK POLICY
- If a mask is attached, treat it as the legal transformation zone.
- Include mask: transform only the WHITE region.
- Exclude mask: the WHITE region is locked and must not change.

DELTA CONTRACT
- Default to one creative delta per pass.
- A second delta is allowed only if inseparable.
- Any explicit unlock must remain narrow and named.
- If an unlock is not named, treat that area as locked.

FAIL CONDITIONS
- Missing or invalid base image.
- Missing active lock set.
- Identity drift beyond the requested transformation.
- Style drift.
- Camera drift.
- Composition drift.
- Structural drift when not explicitly requested.
- Unrequested secondary changes.

ALPHA / BACKGROUND LOCK
- Preserve alpha behavior from the base unless transformation explicitly changes background.
- Do not add white matte fills.
- Do not replace transparent or blank backgrounds with paper, white boxes, or gradients.

OUTPUT
- Return one transformed image.
- Same canvas as the base image.
- Preserve lineage to the base image.
- If exact compliance is not possible, output FAIL.`;

export const TATTOO_PHASE_1C_PROMPT = PHASE_1C_CONSTRAINED_CREATIVE_EDIT;
export const TATTOO_PHASE_1C = {
  name: 'tattoo-phase-1c-creative-delta',
  version: 'v2.2-studio-creative',
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
    const transferMode = (args.references && args.references.length > 0) ? (args.transferMode ?? 'none') : 'none';
    const symmetry = args.symmetryLock ? 'ENABLED' : 'DISABLED';
    const maskType = args.maskType ?? 'include';

    let maskLine = 'No mask provided. Keep the transformation bounded to the logical target region.';
    if (args.maskMode === 'provided') {
      maskLine =
        maskType === 'include'
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
      'ACTIVE LOCKSET - VERBATIM:',
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
