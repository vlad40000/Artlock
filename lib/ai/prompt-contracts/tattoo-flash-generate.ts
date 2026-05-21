// ── Flash Design Generation ───────────────────────────────────────────────────
// Generates a new tattoo design locked to an extracted flash theme.
// This is a text-to-image generation — no base image required.
// The theme lock is the single source of truth for style, palette, and motif rules.

export const TATTOO_FLASH_GENERATE = {
  name: 'tattoo-flash-generate',
  version: 'v1.0-flash-generate',

  buildPrompt(args: {
    subjectRequest: string;
    rawThemeLock: string;
    paletteLock: string;
    lineWeightLock: string;
    shadingLock: string;
    compositionRules: string;
    motifLock: string;
    styleFamilyLock: string;
  }) {
    return `FLASH DESIGN GENERATION
(TEXT-TO-IMAGE · THEME-LOCKED · PRODUCTION-READY TATTOO DESIGN)

---

## TOOL ROUTING (HARD)

- Operation type: Text-to-image generation
- Mode: Generate a new tattoo design from the active theme lock
- Canvas: White or transparent background
- Output: One tattoo design, production-ready, stencil-readable

---

## ACTIVE THEME LOCK (SOURCE OF TRUTH — ABSOLUTE)

${args.rawThemeLock}

---

## THEME FIELDS (ALL HARD-LOCKED)

Style Family: ${args.styleFamilyLock}
Palette: ${args.paletteLock}
Motif Scope: ${args.motifLock}
Line Weight: ${args.lineWeightLock}
Shading: ${args.shadingLock}
Composition: ${args.compositionRules}

---

## SUBJECT REQUEST

${args.subjectRequest.trim()}

---

## GENERATION RULES

- Generate a SINGLE tattoo design matching the subject request above
- Style, palette, line weight, and shading must match the active theme lock exactly
- Design must be stencil-readable — clean separations, no muddy fills
- Subject must fall within the motif scope defined in the theme lock
- If the subject conflicts with the motif scope, adapt it to fit — do not ignore the lock
- White or flat neutral background — no environmental context unless in composition rules
- No watermarks, no logos, no text unless subject request explicitly asks for it
- Do not blend multiple style families — stay strictly within the locked style

---

## PRODUCTION QUALITY BAR

- Clear long-distance read
- Preserved silhouette anchors
- Controlled black-to-skin balance
- No micro-detail below stencil threshold
- Line hierarchy appropriate to style family
- Negative space intentional
- Shape language survives scale reduction

---

## FAIL-SAFE

- If subject cannot be rendered within the theme lock → adapt subject, do not break lock
- No style drift
- No palette invention
- No composition drift from rules`;
  },
} as const;

export default TATTOO_FLASH_GENERATE;
