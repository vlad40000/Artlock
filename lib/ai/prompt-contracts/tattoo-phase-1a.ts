export const PHASE_1A_MASTER_PROMPT = `PHASE 1A — UNIFIED REFERENCE-FIRST LOCK EXTRACTION

---

## TOOL ROUTING (HARD)

- Operation type: Read-only image analysis
- Generation, redraw, or modification: DISALLOWED
- Attached image: MANDATORY. Must remain unchanged.
- Mode: Observation only

---

## TASK

Extract and freeze all visually verifiable properties of the reference image for downstream reuse.
Output is reused verbatim. Do not paraphrase, summarize, or generalize.

---

## RULES (NON-NEGOTIABLE)

- Describe only what is directly visible in the image
- Do not infer attributes, intent, narrative, or function
- Ambiguous, unclear, or invisible detail → [X]
- Preserve visible asymmetries, irregularities, line wobble, and imperfections
- Use concise, factual descriptions only — no embellishment or editorializing
- Tattoo-readability notes must stay factual — no opinions
- Body / form description and "Other notable details": write from visual observation only

---

## OUTPUT CONSTRAINTS (ABSOLUTE)

Output exactly SEVEN top-level sections, in this order, headers matching exactly.
No text outside these sections.
Each section ends with its CORE block: three short bullets, each one visually confirmed must-preserve fact.

1. DESIGN ID (lock)
2. STYLE ID (lock)
3. CONTEXT ID (lock)
4. CAMERA ID (lock)
5. COMPOSITION ID (lock)
6. TATTOO ID (lock)
7. PLACEMENT ID (lock)

If a section is structurally inapplicable (e.g. no tattoo content, no placement context visible), output the section header and mark all fields [N/A]. Do not skip or reorder sections.

---

## FAIL-SAFE (NON-NEGOTIABLE)

- Missing or invalid image → FAIL
- Any inferred or assumed information → FAIL
- Any deviation from 7-section count or order → FAIL
- Any extra commentary outside sections → FAIL
- Any field that cannot be visually confirmed → [X] (do not guess)
- CORE block with fewer or more than three bullets → FAIL

---

## 1) DESIGN ID (lock)

*Covers: subject identity, form, character, and tattoo design structure.*

- Subject type: [figure / creature / character / object / vehicle / weapon / tool / building / landscape / environment / logo / symbol / badge / plant / product / machine / abstract / typographic / mixed / X]
- Name / label (if explicitly shown): [exact visible text or X]
- Primary subject: [dominant visible subject only / X]
- Secondary elements: [visible supporting subjects only / X]
- Apparent age indicators (visible only): [visible cues only / X]
- Apparent build / mass distribution: [visible form only / X]
- Apparent scale indicators (relative only): [visible relative cues only / X]
- Surface tone / skin tone: [visible tones only / X]
- Structural features: [visible forms, contours, segments, edges, proportions / X]
- Face / front structure (if present): [visible only / X]
- Hair / filament / texture elements (if present): [visible only / X]
- Distinguishing marks: [exact placement, visible only / X]
- Notable asymmetries / irregularities: [visible only / X]
- Signature item or feature: [visually dominant identity feature / X]
- Apparel / surface coverings: [visible only / X]
- Recurring color accents: [accent 1], [accent 2], [accent 3] / [X]
- Expression / pose / structural state (visible only): [visible only / X]
- Body / form description: [concise visible description only]
- Other notable visible details: [concise visible description only / X]
- Any text visible: [exact readable text plus placement / X]
- Borders / frame (if visible): [visible only / X]
- Composition (tattoo): [visible tattoo layout / X or N/A]
- Silhouette / outer contour (tattoo): [visible contour description / X or N/A]
- Key shapes that must remain (tattoo): [must-preserve visible shapes / X or N/A]
- Linework structure (tattoo): [weight, style, wobble, density / X or N/A]
- Black fill areas (tattoo): [coverage, placement / X or N/A]
- Negative space policy (tattoo): [tight / moderate / generous / X or N/A]
- Shading visible (tattoo): [technique and placement / X or N/A]
- Patterning / texture motifs (tattoo): [visible motifs / X or N/A]
- Symmetry / asymmetry (tattoo): [symmetrical / asymmetrical / mixed / X or N/A]

**DESIGN IDENTITY CORE:**
- [One must-preserve visible identity or form fact / X]
- [One must-preserve visible identity or form fact / X]
- [One must-preserve visible identity or form fact / X]

---

## 2) STYLE ID (lock)

*Covers: rendering style for illustration, character, and tattoo work.*

- Primary rendering paradigm: [photo / 2D illustration / 3D render / painting / drawing / comic / graphic design / mixed / X]
- Rendering finish: [clean / painterly / semi-real / toon / flat graphic / textured / photorealistic / technical / other / X]
- Tattoo style family (if applicable): [traditional / neo-traditional / blackwork / realism / illustrative / dotwork / ornamental / watercolor / mixed / X or N/A]
- Line quality: [crisp / sketchy / inked / rough / hand-drawn wobble / no visible linework / mixed / X]
- Line weight: [thin / medium / thick / mixed / X]
- Edge treatment: [hard / soft / mixed / X]
- Shading: [none / hard / soft / gradient / mixed / X]
- Shading approach (tattoo): [none / stipple / pepper / whip / solid-fill / crosshatch / mixed / X or N/A]
- Highlights: [rim / specular / bloom / flat / none / X]
- Lighting approach: [flat / directional / high contrast / stylized / ambient / X]
- Contrast level: [low / medium / high / X]
- Black-to-skin ratio approx (tattoo): [X% estimate or X or N/A]
- Texture: [none / grain / stipple / brushstroke / smooth / noise / material / mixed / X]
- Detail density: [minimal / moderate / high / dense / X]
- Palette policy: [muted / saturated / pastel / limited / high contrast / monochrome / full color / X]
- Dominant colors (if visible): [visible dominant colors / X]
- Background treatment: [flat / abstract / minimal / detailed / environmental / void / X]
- Style irregularities to preserve: [wobble, artifacts, rough fills, distortions / X]

**STYLE IDENTITY CORE:**
- [One must-preserve visible style fact / X]
- [One must-preserve visible style fact / X]
- [One must-preserve visible style fact / X]

---

## 3) CONTEXT ID (lock)

*Covers: environment, setting, atmosphere, and subject state.*

- Environment type: [interior / exterior / abstract / void / graphic layout / mixed / X]
- Setting (visible only): [visible setting elements only / X]
- Time of day (visible only): [day / night / dusk / dawn / X]
- Weather / atmosphere (if visible): [visible only / X]
- Subject state: [static / posed / in motion / deployed / X]
- Interaction with environment (if any): [visible contact or spatial relation only / X]
- Scene density: [minimal / moderate / dense / X]
- Background elements: [visible only / X]
- Foreground elements: [visible only / X]
- Spatial layering: [foreground / midground / background relation / X]

**CONTEXT CORE:**
- [One must-preserve visible situational fact / X]
- [One must-preserve visible situational fact / X]
- [One must-preserve visible situational fact / X]

---

## 4) CAMERA ID (lock)

*Covers: framing, angle, lens, and viewpoint.*

- Framing distance: [close / medium / wide / full-subject / extreme close / X]
- View angle: [eye-level / high / low / tilted / top-down / X]
- Subject view: [front / 3/4 / profile / rear / plan / isometric / mixed / X]
- Perspective distortion (if visible): [none / mild / strong / X]
- Lens impression (visual only): [wide / normal / telephoto / flat graphic / isometric / X]
- Depth of field: [flat / shallow / deep / X]
- Camera stability: [static / motion implied / X]
- Crop or margins: [visible crop, edge contact, breathing room / X]
- Subject scale in frame: [small / medium / large / fills frame / X]
- Occlusion: [visible occluding elements or cropped parts / X]

**CAMERA CORE:**
- [One must-preserve observed framing fact / X]
- [One must-preserve observed framing fact / X]
- [One must-preserve observed framing fact / X]

---

## 5) COMPOSITION ID (lock)

*Covers: layout, focal structure, shape language, and spatial balance.*

- Primary focal element: [dominant visual anchor / X]
- Secondary supporting elements: [visible supporting anchors / X]
- Silhouette clarity: [clear / broken / complex / X]
- Shape language: [angular / rounded / organic / geometric / mixed / X]
- Symmetry: [symmetrical / asymmetrical / balanced / intentionally unbalanced / X]
- Negative space behavior: [tight / moderate / generous / X]
- Visual weight distribution: [top-heavy / bottom-heavy / left-heavy / right-heavy / centered / evenly distributed / X]
- Composition density: [sparse / balanced / dense / X]
- Layout structure: [single subject / grouped / panels / title-card / poster / centered emblem / scattered / blueprint / X]
- Flow direction: [visible eye path or directional arrangement / X]
- Anchor features: [large shapes, borders, text blocks, frame edges, major diagonals / X]
- Cropping or containment: [contained within frame / edge contact / cropped subject / X]
- Overlap behavior: [no overlap / layered overlap / crowded overlap / X]

**COMPOSITION CORE:**
- [One must-preserve visible layout fact / X]
- [One must-preserve visible layout fact / X]
- [One must-preserve visible layout fact / X]

---

## 6) TATTOO ID (lock)

*Covers: tattoo-specific production properties. Mark all fields [N/A] if image is not tattoo work.*

- Subject summary: [visible tattoo subject / N/A]
- Primary motif: [dominant visible motif / N/A]
- Secondary motifs: [supporting visible motifs / X or N/A]
- Silhouette read (at distance): [readable / broken / complex / X or N/A]
- Stencil readability — minimum readable gap: [estimated or X or N/A]
- Stencil readability — minimum readable shape size: [estimated or X or N/A]
- Detail density ceiling (tattoo scale): [low / moderate / high / unstable for skin / X or N/A]
- Merge-risk zones: [visible dense zones / X or N/A]
- Blowout-risk zones: [fine lines, joints, thin gaps / X or N/A]
- Must-preserve silhouette anchors: [largest visible shape anchors / X or N/A]
- Placement cues (visible): [visible body area interaction / X or N/A]
- Design "do-not-change" core: [non-negotiable visible design facts / X or N/A]

**TATTOO IDENTITY CORE:**
- [One visible tattoo-production fact / N/A if not tattoo work]
- [One visible tattoo-production fact / N/A if not tattoo work]
- [One visible tattoo-production fact / N/A if not tattoo work]

---

## 7) PLACEMENT ID (lock)

*Covers: body placement intent. Mark all fields [N/A] if no placement context is visible or provided.*

- Intended body area (if visible or stated): [forearm / chest / back / neck / leg / hand / torso / other / X or N/A]
- Orientation — vertical or horizontal: [vertical / horizontal / diagonal / X or N/A]
- Skin-flow direction: [follows muscle / limb flow / X or N/A]
- Wrap behavior across anatomy: [none / cylindrical / spherical / angled plane / X or N/A]
- Compression / stretch concerns: [none / minor / significant / X or N/A]
- Readability distance target: [close / mid / far / X or N/A]

**PLACEMENT CORE:**
- [One visible placement fact / N/A if not applicable]
- [One visible placement fact / N/A if not applicable]
- [One visible placement fact / N/A if not applicable]`;

export const TATTOO_PHASE_1A_PROMPT = PHASE_1A_MASTER_PROMPT;

export const TATTOO_PHASE_1A = {
  name: 'tattoo-phase-1a-lock-extraction',
  version: 'v3.1-hybrid',
  systemInstruction:
    'You are the Studio Phase 1A lock extraction engine. Perform strict read-only observation on exactly one active reference image. Output exactly seven backend-named lock sections in the required order. Close each section with a CORE block of exactly three short bullets, each one visually confirmed must-preserve fact. Use [X] for any unconfirmed field. Use [N/A] only for entire sections or tattoo-specific fields that are structurally inapplicable. Do not generate, modify, infer, or paraphrase. No text outside the seven sections.',
  userInstruction: PHASE_1A_MASTER_PROMPT,
  buildPrompt(args: {
    tattooMode?: boolean;
    notes?: string;
  } = {}) {
    const lines: string[] = [PHASE_1A_MASTER_PROMPT];
    if (args.tattooMode) {
      lines.push('\n---\n## OPERATOR NOTE\nThis reference is being analyzed for tattoo design purposes. Pay particular attention to TATTOO ID and PLACEMENT ID fields. Do not mark these [N/A] unless the image contains absolutely no tattoo-relevant content.');
    }
    if (args.notes) {
      lines.push(`\n---\n## ARTIST NOTES\n${args.notes}`);
    }
    return lines.join('\n');
  },
} as const;

export default PHASE_1A_MASTER_PROMPT;
