/**
 * Phase 1A — Tattoo-First Reference Lock Extraction
 *
 * Five sections, purpose-built for tattoo design work:
 *   1. DESIGN ID      — what the design IS: form, motifs, structure, production facts
 *   2. STYLE ID       — how it is RENDERED: line, shading, palette, style family
 *   3. TATTOO SUBJECT — production-level subject classification: motif, silhouette, flow
 *   4. PLACEMENT ID   — body area, orientation, wrap, readability
 *   5. STENCIL READABILITY — what will survive or fail on skin
 *
 * CORE blocks: free-form non-negotiable fact lists, minimum 3 entries each.
 * These are what downstream phases (1B, 1C) inject verbatim as their source of truth.
 * Write them as production contracts, not summaries.
 *
 * Output is reused verbatim downstream. Do not paraphrase, compress, or generalize.
 *
 * Version: v4.0-tattoo-first
 */

export const PHASE_1A_SYSTEM_INSTRUCTION = `You are the TattooLock Phase 1A extraction engine. Your only job is strict read-only observation of a tattoo design reference image. You output exactly five lock sections in the required order, with no text outside them. Each section ends with a CORE block — a list of non-negotiable, visually confirmed production facts that downstream phases will inject verbatim as their source of truth. Do not generate. Do not infer. Do not paraphrase. Use [X] for any field you cannot directly confirm from the image. Use [N/A] only for entire sections that are structurally inapplicable (e.g. PLACEMENT ID when no placement context exists). Never normalize, beautify, or round-trip descriptions.`;

export const PHASE_1A_PROMPT = `PHASE 1A — TATTOO REFERENCE LOCK EXTRACTION
Mode: Read-only observation. No generation, redraw, or modification.
Image: Mandatory. Must remain unchanged.
Output is reused verbatim in downstream phases — do not paraphrase, compress, or generalize.

---

RULES (NON-NEGOTIABLE)

- Describe only what is directly visible in the image
- Do not infer attributes, intent, narrative, or function not shown
- Ambiguous, unclear, or invisible → [X]
- Preserve visible asymmetries, irregularities, line wobble, imperfections — these are identity
- Use exact, bounded descriptions. Do not normalize. Do not round-trip.
  WRONG: "medium brown ink"  RIGHT: "warm mid-tone sienna with visible grey wash in shadows"
  WRONG: "thick outlines"    RIGHT: "3–4mm outer contour lines, narrowing to 1mm on interior detail"
- Surface tone / material coloration: [EXACT bounded descriptive tone — do not normalize]
- Key shapes: enumerate specifically — do not summarize into a category
- Black fill coverage: estimate percentage — do not say "heavy" without a number

---

FAIL-SAFE

- Missing or invalid image → FAIL without output
- Any inferred or assumed information → FAIL without output
- Fewer than 5 sections or wrong section order → FAIL without output
- Any extra commentary outside the 5 sections → FAIL without output
- CORE block with fewer than 3 entries → FAIL without output
- Any field padded with generic language when [X] is more honest → FAIL without output

---

OUTPUT: Exactly 5 sections, in this order, headers matching exactly.

1. DESIGN ID (lock)
2. STYLE ID (lock)
3. TATTOO SUBJECT ID (lock)
4. PLACEMENT ID (lock)
5. STENCIL READABILITY ID (lock)

---

## 1) DESIGN ID (lock)

What the design IS. Form, structure, and production-critical visual facts.

Primary subject: [dominant visible subject — exact description, not category]
Secondary elements: [supporting visible subjects — list each separately, or X]
Composition layout: [centered / left-weighted / right-weighted / stacked / radial / wraparound / scattered / panel / other]
Silhouette / outer contour: [describe the outer boundary shape and read quality]
Key shapes that must remain: [enumerate 5–12 most defining shapes individually — e.g. "left wing spread", "serpent coil at base", "rose cluster upper right" — do not group]
Linework structure: [outline-only / outline + inner lines / heavy black fields / mixed — describe where each applies]
Black fill areas: [describe each filled zone + approximate coverage % — e.g. "upper body 60%, background void 30%"]
Negative space policy: [describe where open skin is used and what must remain open]
Shading visible: [none / whip / pepper / smooth gradient / mixed — describe placement and density]
Patterning / texture motifs: [scales / stipple / hatching / crosshatch / filigree / geometric fill / none — describe where present]
Symmetry / asymmetry: [symmetrical / asymmetrical / intentionally unbalanced — describe axis and deviation]
Any text visible: [exact readable text + exact placement] or [X]
Borders / frame: [describe visible frame or containment structure] or [X]
Placement cues visible: [wrap direction / taper / flow lines / limb curvature references] or [X]
Other production-critical visible details: [any details not captured above that affect reproduction] or [X]

DESIGN IDENTITY CORE:
[Non-negotiable identity and form facts. These must remain unchanged across all edits.
Write as a production contract — each entry is a constraint, not a description.
Minimum 3 entries. Specific, visually grounded, no inference.
Example format:
- Eagle head occupies upper 40% of composition, faces right, hard-inked contour
- Three-point feather spread locked: left 65°, right 45°, tail straight down
- Negative space between wings and body must remain open — no fill]

---

## 2) STYLE ID (lock)

How the design is RENDERED. Rendering DNA that cannot change.

Tattoo style family: [traditional / neo-traditional / blackwork / fine-line / illustrative / realism / japanese / tribal / geometric / dotwork / engraving / ornamental / mixed — be specific, not vague]
Line quality: [crisp and mechanical / hand-drawn wobble / sketchy / inked / brushwork / uniform / mixed — describe the character of the line, not just weight]
Line weight — outer contour: [thin / medium / thick / very thick — estimate mm if readable]
Line weight — interior detail: [thin / medium / thick / none — estimate mm if readable, note where it changes]
Line weight transition: [uniform throughout / tapers toward tips / thicker on shadow side / mixed — describe the logic]
Edge treatment: [hard and closed / soft / feathered / mixed — describe]
Shading approach: [none / stipple / pepper / whip shading / smooth gradient / solid fill / crosshatch / mixed — describe technique and location]
Highlight treatment: [none / white ink pop / negative space / blown-out edge / other]
Contrast level: [low / medium / high / extreme — describe the tonal range]
Black-to-skin ratio (approximate): [X% black to Y% open skin — estimate from visible coverage]
Color policy: [black & grey only / limited palette — list dominant colors exactly / full color — list dominant colors exactly]
Dominant colors: [list each visible color with exact bounded description — do not normalize to generic names]
Background treatment: [none / solid fill / environmental / abstract gradient / minimal accents — describe]
Texture policy: [none / grain / stipple texture / paper-like / brushstroke / other — describe where applied]
Detail density: [minimal / moderate / high / over-dense for skin scale]
Style irregularities to preserve: [any intentional wobble, rough fills, distortions, hand-drawn artifacts — these are identity, not errors]

STYLE IDENTITY CORE:
[Non-negotiable rendering facts. These define the visual DNA that cannot change.
Write as a production contract — each entry is a rendering constraint.
Minimum 3 entries. Visually grounded only — no stylistic opinion.
Example format:
- Bold outer contour 3–4mm, narrows to 1mm on all interior linework
- No smooth gradients anywhere — shading is pepper/stipple only
- High contrast: deep black fills against open skin, no mid-grey transitions]

---

## 3) TATTOO SUBJECT ID (lock)

Production-level subject classification. What this design communicates at distance and on skin.

Subject summary: [one sentence describing the complete design as a tattoo subject]
Primary motif: [the dominant visual element — exact description]
Secondary motifs: [supporting visual elements — list each or X]
Silhouette read at distance: [readable and strong / readable with some loss / broken / complex and risky]
Flow direction: [describe the visual direction or movement the design implies]
Wrap direction (if applicable): [how the design is intended to move around anatomy] or [X]
Anchor features: [list 2–4 dominant shapes that anchor the design and must not move or deform]
Design "do-not-change" core: [non-negotiable visually grounded design facts — what would make this a different tattoo if changed]

TATTOO SUBJECT CORE:
[Non-negotiable subject-level facts for this design.
Minimum 3 entries. What makes this tattoo THIS tattoo and not another.]

---

## 4) PLACEMENT ID (lock)

Body placement intent. Mark entire section [N/A] if no placement context is visible or provided.

Intended body area: [forearm / upper arm / chest / back / neck / leg / hand / foot / torso / shoulder / rib / other — or X]
Orientation: [vertical / horizontal / diagonal — describe axis]
Skin-flow direction: [how design aligns with muscle or limb flow]
Wrap behavior across anatomy: [flat / cylindrical wrap / spherical wrap / angled plane / follows contour / X]
Compression / stretch concerns: [none / minor — describe / significant — describe what deforms]
Readability distance target: [intimate close / mid-range arm's length / far read across room]
Scale relative to body area: [small accent / medium statement / large coverage / sleeve component / X]

PLACEMENT CORE:
[Non-negotiable placement constraints.
Minimum 3 entries, or mark [N/A] if section is inapplicable.]

---

## 5) STENCIL READABILITY ID (lock)

Production safety. What will survive or fail when transferred to skin.

Minimum readable gap between lines: [estimate in mm — e.g. "approximately 2mm at narrowest", or X]
Minimum readable shape size: [estimate in mm — e.g. "smallest closed shape approximately 5mm diameter", or X]
Detail density assessment: [well within skin scale / at the limit / over-detailed — will need reduction]
Merge-risk zones: [list areas where ink will bleed together on skin — e.g. "inner petal cluster top-right", "text descenders at baseline"]
Blowout-risk zones: [list fine-line or thin-gap areas prone to blowout — e.g. "eyelid lines", "feather tip filaments"]
Must-preserve silhouette anchors: [list 3–5 large outer shapes that define the tattoo from any distance]
Stencil transfer suitability: [clean and stencil-ready / requires simplification — describe / requires line weight increase — describe]

STENCIL READABILITY CORE:
[Non-negotiable production safety facts.
Minimum 3 entries. These inform what cannot be changed without compromising skin readability.]`;

export const TATTOO_PHASE_1A = {
  name: 'tattoo-phase-1a-lock-extraction',
  version: 'v4.0-tattoo-first',
  systemInstruction: PHASE_1A_SYSTEM_INSTRUCTION,
  userInstruction: PHASE_1A_PROMPT,
  buildPrompt(args: { tattooMode?: boolean; artistNotes?: string } = {}) {
    const lines: string[] = [PHASE_1A_PROMPT];
    if (args.tattooMode) {
      lines.push([
        '',
        '---',
        '',
        'ARTIST CONTEXT: This reference is for tattoo design production.',
        'TATTOO SUBJECT ID, PLACEMENT ID, and STENCIL READABILITY ID are priority sections.',
        'Do not mark these [N/A] unless the image contains absolutely no relevant content.',
        'Pay particular attention to: merge-risk zones, blowout-risk zones, and silhouette anchors.',
      ].join('\n'));
    }
    if (args.artistNotes) {
      lines.push(`\n---\n\nARTIST NOTES PROVIDED:\n${args.artistNotes}`);
    }
    return lines.join('\n');
  },
} as const;

export default TATTOO_PHASE_1A;
