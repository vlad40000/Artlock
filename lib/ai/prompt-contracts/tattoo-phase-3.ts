export const PHASE_3_VARIANT_SHEET = String.raw`PHASE 3 — FLASH VARIANT GENERATION
(IMAGE-TO-IMAGE · THREE-PANEL PRODUCTION FORMAT · ZERO-DRIFT DESIGN)

---

## TOOL ROUTING (HARD)

- Operation type: Image-to-image generation
- Base design image: MANDATORY
- DESIGN ID (lock): MANDATORY
- STYLE ID (lock): MANDATORY
- This phase generates production format variants — not redesigns or layout changes
- If same-design consistency cannot be preserved → FAIL

---

## GOAL

Produce three production-ready tattoo format variants from one locked design.
All three panels must read as the same locked design — only the rendering format changes.

---

## SOURCE OF TRUTH

1. Base design image
2. DESIGN ID (lock)
3. STYLE ID (lock)

---

## CANVAS LOCK (ABSOLUTE)

- Inherit source aspect ratio and resolution exactly
- No resize, crop, reframe, or padding
- Layout: single sheet with three labeled panels OR three separate images as requested
- Background: same as reference or flat neutral as specified

---

## DESIGN LOCK (HARD)

- Same composition across all three panels
- Same silhouette across all three panels
- Same key shapes across all three panels
- Same negative-space map across all three panels
- Same text and marks unless explicitly excluded
- No new elements
- No removed elements
- No redesign of hidden or unclear areas

---

## STYLE LOCK (HARD)

- Preserve line quality and line-weight logic across all panels
- Preserve shading family — vary only what the panel format requires
- Preserve palette family
- Preserve tattoo-production readability

---

## REQUIRED OUTPUTS (ALL THREE — NO EXCEPTIONS)

### PANEL 1 — LINEWORK (stencil-ready)
- Outline + essential interior lines only
- No shading, gradients, or texture fills
- Clean separations for stencil transfer
- Must be stencil-readable at target scale
- Lines must be closed and unambiguous

### PANEL 2 — BLACK & GREY
- Same design with shading per STYLE ID
- Readable negative space — no collapse
- High contrast — no muddy midtones
- No detail loss from shading density

### PANEL 3 — COLOR or HIGH-CONTRAST BLACKWORK
- Use color only if STYLE ID explicitly supports it
- If color unsupported → high-contrast blackwork instead
- Existing palette only — no new palette families introduced
- Clean bounded fills, tattoo-readable
- Do not introduce gradients or effects absent from STYLE ID

---

## CONSISTENCY QA (ALL THREE PANELS)

- Identical shape map and line-thickness logic across all panels
- Identical composition across all panels
- Identical identity across all panels
- No filler ornaments, decorative drift, or label invention
- No text unless present in reference

---

## FAIL-SAFE

- Missing or invalid base image → FAIL
- Missing DESIGN ID or STYLE ID lock → FAIL
- Design drift across panels → FAIL
- Forced crop, resize, or hidden recomposition → FAIL
- Style-family drift between panels → FAIL
- Fewer than three panels produced → FAIL

---

## OUTPUT

- One three-panel sheet (or three separate images if requested)
- Panels labeled: LINEWORK / BLACK & GREY / COLOR (or BLACKWORK)
- If exact same-design consistency cannot be maintained → FAIL`;

export const TATTOO_PHASE_3 = {
  name: 'tattoo-phase-3-flash-variant-sheet',
  version: 'v3.0-flash-variant',
  buildPrompt(args: {
    designIdLock: string;
    styleIdLock: string;
    aspectRatio: string;
    resolution: string;
    constraints?: string | null;
    layout?: 'single' | 'separate';
  }) {
    return [
      PHASE_3_VARIANT_SHEET,
      '',
      'RUNTIME INPUTS:',
      '- Base design image: [Base Image]',
      '',
      'ACTIVE LOCKS — VERBATIM:',
      args.designIdLock,
      args.styleIdLock,
      '',
      'CANVAS TARGET:',
      '- Aspect ratio: ' + args.aspectRatio,
      '- Resolution: ' + args.resolution,
      '- Layout: ' + (args.layout === 'separate' ? 'three separate images' : 'one canvas, three labeled panels: LINEWORK / B&G / COLOR'),
      '',
      'CLIENT CONSTRAINTS:',
      args.constraints?.trim() || '[X]',
    ].join('\n');
  },
} as const;

export default PHASE_3_VARIANT_SHEET;
