export const PHASE_3_VARIANT_SHEET = String.raw`PHASE 3 - VARIANT SHEET

TOOL ROUTING - HARD
- Operation type: image-to-image generation.
- The attached base design image is mandatory.
- DESIGN ID and STYLE ID are mandatory.
- This phase generates controlled production variants of the same design.
- If the same-design constraint cannot be preserved: FAIL.

MISSION
- Produce a traceable variant sheet from one locked design.
- Generate production-usable outputs, not redesign concepts.
- Keep the design identical while varying presentation mode.

SOURCE OF TRUTH
1) Base design image
2) DESIGN ID
3) STYLE ID
4) Client constraints

CANVAS LOCK - ABSOLUTE
- Aspect ratio: [ASPECT_RATIO]
- Resolution: [RESOLUTION]
- Layout: [LAYOUT]
- Background: same as the reference unless the route explicitly changes presentation.

DESIGN LOCK - HARD
- Same composition.
- Same silhouette.
- Same key shapes.
- Same negative-space map.
- Same text and marks unless explicitly requested otherwise.
- No new elements.
- No removed elements.
- No redesign of hidden or unclear areas.

STYLE LOCK - HARD
- Preserve line quality and line-weight logic.
- Preserve shading family while varying only what the panel type requires.
- Preserve palette family.
- Preserve tattoo-production readability.

REQUIRED OUTPUTS
1) LINEWORK
- Outline plus essential interior lines only.
- No shading, gradients, or painterly texture fills.
- Must remain stencil-readable.

2) BLACK AND GREY
- Same design with controlled shading.
- Maintain clear negative space.
- Avoid muddy midtones and detail collapse.

3) COLOR OR HIGH-CONTRAST BLACKWORK
- Use color only if the style and source support it.
- If color is unsupported, substitute a high-contrast blackwork version instead.
- Do not introduce new palette families.

CONSISTENCY RULES
- Same shape map across all outputs.
- Same line hierarchy across all outputs.
- Same composition across all outputs.
- Same identity across all outputs.
- No filler ornaments or decorative drift.

FAIL CONDITIONS
- Missing or invalid base image.
- Missing required locks.
- Design drift across panels.
- Forced crop, resize, or hidden recomposition.
- Style-family drift.

OUTPUT
- Return one three-panel sheet.
- If exact same-design consistency cannot be maintained, output FAIL.`;

export const TATTOO_PHASE_3 = {
  name: 'tattoo-phase-3-variant-sheet',
  version: 'v2.3-studio-variant-sheet',
  buildPrompt(args: {
    designIdLock: string;
    styleIdLock: string;
    aspectRatio: string;
    resolution: string;
    constraints?: string | null;
  }) {
    return [
      PHASE_3_VARIANT_SHEET,
      '',
      'ACTIVE LOCKS - VERBATIM:',
      args.designIdLock,
      args.styleIdLock,
      '',
      'CLIENT CONSTRAINTS:',
      args.constraints?.trim() || '[X]',
      '',
      'CANVAS TARGET:',
      '- Aspect ratio: ' + args.aspectRatio,
      '- Resolution: ' + args.resolution,
      '- Layout: one canvas, three labeled panels: LINEWORK / B&G / COLOR',
    ].join('\n');
  },
} as const;

export default PHASE_3_VARIANT_SHEET;
