export const PHASE_1B_GENERATE_SURGICAL_TATTOO_EDIT = `PHASE 1B - SURGICAL EDIT

TOOL ROUTING - HARD
- Operation type: image-to-image edit.
- A Base image is mandatory.
- The active seven-lock set is mandatory.
- Read-only analysis mode is disallowed.
- If preservation rules cannot be met exactly: FAIL.

MISSION
- Apply ONLY the specified localized DELTA to the EXISTING base image.
- Preserve all non-target content exactly in identity, layout, and style.
- Modify ONLY the target region.
- If strict preservation cannot be honored: FAIL.

SOURCE OF TRUTH - STRICT ORDER
1) Base image
2) DESIGN ID
3) STYLE ID
4) CONTEXT ID
5) CAMERA ID
6) COMPOSITION ID
7) TATTOO ID
8) PLACEMENT ID
9) Explicit delta request

CANVAS LOCK - ABSOLUTE
- Aspect ratio: unchanged.
- Resolution: unchanged.
- Framing: unchanged.
- Orientation: unchanged.
- No crop, no resize, no padding, no zoom, no perspective shift.
- No hidden recomposition or restaging.

LOCALIZATION CONTRACT - REQUIRED
- Before generation, the target must be known.
- If TARGET REGION is ambiguous, under-change rather than over-change.
- Modify only the specified region.
- Do not make cleanup edits or beautification passes outside the requested area.
- Do not redesign untouched regions.

MASK LOCK (If provided)
- A mask is a hard, pixel-perfect boundary.
- Only the included mask area may change.
- Any change outside the masked region is forbidden.
- If the request cannot be completed fully inside the mask: FAIL.

EDIT SHAPE
- Default to one surgical delta per pass.
- A second delta is allowed only if inseparable from the first.
- The change must be visually measurable.
- The change must stay localized.
- Unrequested cleanup is forbidden.
- Unrequested redesign is forbidden.

IDENTITY LOCK - HARD
- Preserve subject identity, silhouette, proportions, and component placement.
- Preserve frontal features, aperture structure, face logic, or dominant identifying forms.
- Preserve distinguishing marks, labels, visible text, attachments, and asymmetries unless explicitly changed.
- Preserve all unchanged regions exactly in intent.

STYLE LOCK - HARD
- Preserve rendering paradigm.
- Preserve line quality and line-weight behavior.
- Preserve shading method and contrast logic.
- Preserve texture policy.
- Preserve palette family unless explicitly changed by the delta.
- No global restyling.

CONTEXT / CAMERA / COMPOSITION LOCK - HARD
- Preserve environment type and visible scene logic unless explicitly changed.
- Preserve camera distance, view angle, crop, subject scale, and lens impression.
- Preserve focal hierarchy, negative space, layout structure, and visual weight.
- No x/y subject drift unless explicitly requested.

TATTOO / PLACEMENT LOCK - CONSERVATIVE
- Preserve tattoo-production readability where visibly present in the source and lock text.
- Preserve placement/body-flow cues only where visibly supported by the base image and lock text.
- Do not invent new placement logic.
- If tattoo or placement fields are mostly [X], do not hallucinate tattoo-production or anatomy-specific detail.

MASK POLICY
- If a mask is attached, treat it as a hard edit boundary.
- Include mask: only the white region may change.
- Exclude mask: the white region is locked and must not change.
- Changes outside the allowed edit region are forbidden.

HARD AVOIDS
- No beautification pass.
- No cleanup outside the requested delta.
- No global redraw.
- No camera shift.
- No style shift.
- No added filler objects, symbols, ornaments, or text unless explicitly requested.
- No hidden redesign of unchanged structures.

FAIL CONDITIONS
- Missing or invalid base image.
- Missing active lock set.
- Any canvas drift.
- Any identity drift outside the requested delta.
- Any style drift.
- Any structural drift when not explicitly requested.
- Any unlabeled change outside the permitted edit region.

OUTPUT
- Return one edited image.
- Same canvas as the base image.
- Apply only the requested surgical delta.
- If exact compliance is not possible, output FAIL.`;

export const TATTOO_PHASE_1B_PROMPT = PHASE_1B_GENERATE_SURGICAL_TATTOO_EDIT;
export const TATTOO_PHASE_1B = {
  name: 'tattoo-phase-1b-surgical-edit',
  version: 'v2.2-studio-surgical',
  buildPrompt(args: {
    designIdLock: string;
    styleIdLock: string;
    contextIdLock: string;
    cameraIdLock: string;
    compositionIdLock: string;
    tattooIdLock: string;
    placementIdLock: string;
    references?: {
      designIdLock?: string | null;
      styleIdLock?: string | null;
    }[];
    delta1: string;
    delta2?: string | null;
    maskMode?: 'provided' | 'none';
    regionHint?: string | null;
    symmetryLock?: boolean;
    tattooMode?: boolean;
    maskType?: 'include' | 'exclude';
  }) {
    const delta1 = args.delta1.trim();
    const delta2 = args.delta2?.trim() ? args.delta2.trim() : 'None';
    const regionHint = args.regionHint?.trim() ? args.regionHint.trim() : '[X]';
    const referenceAssistMode = args.references && args.references.length > 0
      ? (args.references.some(r => r.designIdLock) ? 'locked_reference_assist' : 'reference_assist')
      : 'none';
    const symmetry = args.symmetryLock ? 'ENABLED' : 'DISABLED';
    const maskType = args.maskType ?? 'include';

    let maskLine =
      'No mask provided. Keep the edit tightly localized to the named target region and explicit delta only.';
    if (args.maskMode === 'provided') {
      maskLine =
        maskType === 'include'
          ? 'Binary mask attached. Modify only the WHITE mask area. Treat all BLACK mask regions as locked.'
          : 'Binary mask attached. Modify only the BLACK mask area. Treat all WHITE mask regions as locked exclusion zones.';
    }

    const referenceGuidance =
      referenceAssistMode === 'none' || !args.references || args.references.length === 0
        ? ''
        : [
            'REFERENCE ASSIST IMAGES:',
            ...args.references.map((ref, i) => {
              const label = i === 0 ? '[Reference Image]' : `[Reference Image #${i + 1}]`;
              return [
                `${label}:`,
                ref.designIdLock ?? '[Design ID unavailable]',
                ref.styleIdLock ?? '[Style ID unavailable]',
              ].join('\n');
            }),
            '',
            'REFERENCE ASSIST POLICY:',
            '- Mode: ' + referenceAssistMode,
            '- Use the reference assets only to support the requested delta.',
            '- Do not replace the base image identity, layout, style, camera, or composition with references.',
            '- Borrow only explicitly relevant traits from the provided reference set.',
          ].join('\n');

    return [
      PHASE_1B_GENERATE_SURGICAL_TATTOO_EDIT,
      '',
      'RUNTIME INPUTS:',
      '- Base image: [Base Image]',
      '- Mask handling: ' + maskLine,
      '- Target region: ' + regionHint,
      referenceGuidance || null,
      '',
      'LOCALIZATION CONTRACT — REQUIRED',
      'Before generation, the target must be known.',
      'If no valid target exists (e.g. [X], none, null), output FAIL.',
      'This is a surgical edit, not a new image request.',
      'Rewrite the DELTA internally as an edit to the existing image.',
      'The model must not interpret the DELTA as a new portrait or a full redraw.',
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
      'DELTA CONTRACT:',
      'DELTA #1: ' + delta1,
      'DELTA #2: ' + delta2,
      'Everything outside the TARGET REGION must remain pixel-faithful in identity and layout.',
      'Do not reinterpret the portrait.',
      '',
      'CONTROL KNOBS:',
      '- Symmetry Lock: ' + symmetry,
      '',
      'PRODUCTION MODE:',
      args.tattooMode === false
        ? 'TATTOO MODE: OFF. Do not invent tattoo-specific constraints.'
        : 'TATTOO MODE: ON. Preserve visible tattoo readability and production-safe clarity.',
    ]
      .filter((line): line is string => line !== null)
      .join('\n')
      .trim();
  },
} as const;

export default PHASE_1B_GENERATE_SURGICAL_TATTOO_EDIT;
