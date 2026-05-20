export const PHASE_2C_TURNAROUND_MODEL_SHEET = String.raw`PHASE 2C — MODEL SHEET / TURNAROUND
(IMAGE-TO-IMAGE · ORTHOGRAPHIC MULTI-VIEW · ZERO-DRIFT IDENTITY)

---

## TOOL ROUTING (HARD)

- Operation type: Image-to-image generation
- Reference image: MANDATORY
- Active lock set: MANDATORY
- Read-only analysis: DISALLOWED
- No canvas resize, reframing, or recomposition
- No auto-cropping, fit-to-frame, padding, or smart resize
- If identity, style, or construction consistency cannot be preserved → FAIL

---

## MODE

Model Sheet / Character Turnaround.

---

## GOAL

Generate a trace-ready model sheet with the requested views.
All views must read as the same locked design — not a redesign.
Behave like a studio turnaround tool, not a concept-art generator.

---

## SOURCE OF TRUTH

1. Reference image
2. DESIGN ID (lock)
3. STYLE ID (lock)
4. Requested views
5. Requested layout

---

## CANVAS / LAYOUT LOCK

- Aspect ratio: unchanged
- Resolution: unchanged
- Layout: single sheet (labeled panels) or separate images as requested
- Background: same as reference or flat neutral if explicitly requested
- Keep subject scale consistent across all views
- Keep subject span and silhouette logic consistent
- Do not crop the subject
- Do not add unrelated props, symbols, text, or background elements

---

## IDENTITY / CONSTRUCTION LOCK (HARD)

- Preserve subject identity and main silhouette anchors
- Preserve major proportions, attachments, surface markings, and signature forms
- Preserve face proportions, hairline, eye/nose/jaw shape
- Preserve skin tone and all visible markings
- Preserve body proportions and asymmetries
- Continue hidden-side construction conservatively from visible evidence only
- Do not invent decorative systems, components, or redesign logic
- Do not redesign unseen areas — extrapolate conservatively

---

## OUTFIT / GEAR LOCK

- Exact garment construction and placement preserved
- Exact colors and materials preserved
- Patterns preserved — do not invent text or decoration

---

## STYLE LOCK (HARD)

- Rendering paradigm preserved
- Line weight and quality preserved
- Shading method and contrast logic preserved
- Texture policy preserved
- Palette behavior preserved
- Lighting logic preserved
- No style-family shift between views

---

## CAMERA / SCALE LOCK

- Same character scale across all views
- Orthographic turnaround feel — no perspective distortion between panels
- No zoom or crop
- No x/y drift between views

---

## VIEW REQUIREMENTS

FRONT
- Facing camera, neutral stance
- Preserve front-facing construction logic

SIDE
- True 90° profile
- Preserve true profile logic from visible evidence

BACK
- Facing away, show rear construction
- Continue visible construction conservatively — do not invent

THREE-QUARTER (if requested)
- Rotate the same design, do not redesign it

---

## CONSISTENCY RULES

- Same silhouette logic across all views
- Same outfit construction across all views
- Same color placement across all views
- No drift in identity, style, scale, or proportion between panels
- No redesign of unseen areas
- Exploded / component / state sheets valid only when explicitly requested

---

## FAIL-SAFE

- Missing reference image → FAIL
- Missing active lock set → FAIL
- Identity drift across views → FAIL
- Style drift across views → FAIL
- Inconsistent scale between views → FAIL
- Unrequested redesign of hidden areas → FAIL
- Added marks, props, or labels not in base image or locks → FAIL
- Forced crop or resize → FAIL

---

## OUTPUT

- Single labeled sheet OR separate images as requested
- All views read as the same locked design
- If exact consistency cannot be maintained → FAIL`;

export const TATTOO_PHASE_2C = {
  name: 'tattoo-phase-2c-turnaround-model-sheet',
  version: 'v3.0-orthographic-model-sheet',
  buildPrompt(args: {
    views: string[];
    layout: 'single' | 'separate';
    designIdLock?: string;
    styleIdLock?: string;
  }) {
    const lines = [
      PHASE_2C_TURNAROUND_MODEL_SHEET,
      '',
      'RUNTIME INPUTS:',
      '- Reference image: [Base Image]',
      '',
      'REQUESTED VIEWS:',
      args.views.join(' / '),
      '',
      'REQUESTED LAYOUT:',
      args.layout === 'single' ? 'Single sheet with labeled panels' : 'Separate images per view',
    ];

    if (args.designIdLock || args.styleIdLock) {
      lines.push('', 'ACTIVE LOCKSET — VERBATIM:');
      if (args.designIdLock) lines.push(args.designIdLock);
      if (args.styleIdLock) lines.push(args.styleIdLock);
    }

    return lines.join('\n');
  },
} as const;

export default PHASE_2C_TURNAROUND_MODEL_SHEET;
