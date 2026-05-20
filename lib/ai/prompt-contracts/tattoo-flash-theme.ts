export const FLASH_THEME_EXTRACTION_PROMPT = `FLASH THEME EXTRACTION
(READ-ONLY · STYLE DNA ANALYSIS · JSON OUTPUT)

---

## TOOL ROUTING (HARD)

- Operation type: Read-only image analysis
- Generation, redraw, or modification: DISALLOWED
- Attached image: MANDATORY — must remain unchanged
- Mode: Observation only

---

## TASK

Analyze the attached tattoo design and extract its reusable style and motif DNA.
This output will be used to generate new flash designs that belong to the same visual family.
Focus on what makes this design recognizable as part of a coherent collection.

---

## RULES

- Describe only what is directly visible
- No inference, embellishment, or guesswork
- Invisible or ambiguous detail → [X]
- Be specific and production-useful — output will drive AI generation

---

## OUTPUT FORMAT (ABSOLUTE)

Output ONLY valid JSON. No markdown, no backticks, no preamble, no commentary.
Schema:

{
  "suggested_title": "...",
  "style_family": "...",
  "palette_lock": "...",
  "motif_lock": "...",
  "line_weight_lock": "...",
  "shading_lock": "...",
  "composition_rules": "...",
  "raw_theme_lock": "..."
}

---

## FIELD DEFINITIONS

suggested_title
  A short (2–5 word) descriptive name for this theme collection.
  Examples: "Traditional Americana", "Fine Line Botanicals", "Bold Blackwork Geometric"

style_family
  The tattoo style this design belongs to.
  Choose from: traditional / neo-traditional / blackwork / fine-line / illustrative /
  realism / japanese / tribal / geometric / dotwork / engraving / ornamental / other:[specify]

palette_lock
  Exact color description. Include:
  - Whether it is black & grey only, limited palette, or full color
  - Dominant colors with descriptors (e.g. "muted red, mustard yellow, forest green")
  - Ink density tendency (heavy black, light washes, solid fills)

motif_lock
  The primary subject/motif language of this design.
  Be specific about what IS and IS NOT in scope.
  Example: "bold eagle and dagger motifs, American traditional roses, no skulls, no text"
  This field constrains what subject matter belongs on this flash sheet.

line_weight_lock
  Describe the line weight system:
  - Primary outline weight: thin / medium / thick / very thick
  - Interior detail weight: thin / medium / thick / none
  - Whether weights are uniform or variable
  - Any notable line style (hand-drawn wobble, mechanical precision, brushwork)

shading_lock
  The shading approach:
  - Method: none / whip / pepper / smooth gradient / stipple / crosshatch / solid fill / mixed
  - Where shading appears (shadows only, full form, selective)
  - Contrast level: low / medium / high

composition_rules
  Layout guidance for generating new designs in this theme.
  Include:
  - Typical orientation: portrait / landscape / square / any
  - Subject framing: single subject / grouped / with banner / with frame / etc.
  - Background treatment: none / minimal / full
  - Typical scale: micro / small / medium / large
  - Placement tendency (if visible): forearm / chest / back / etc.

raw_theme_lock
  A single cohesive paragraph (3–5 sentences) summarizing the complete theme identity.
  This is the verbatim instruction block injected into generation prompts.
  Write it as a direct instruction to an AI image generator.
  Example: "Generate in American traditional tattoo style with heavy black outlines,
  muted red and mustard yellow fills, and no shading gradients. Subject matter should
  be limited to eagles, daggers, roses, and banners. Each design should be a single
  centered subject on a white background, portrait orientation, stencil-readable."

---

## FAIL-SAFE

- Missing or invalid image → output { "error": "FAIL: missing image" }
- Cannot determine style family → set style_family to "[X]"
- Any field not visually supportable → use "[X]" for that field only`;

export const TATTOO_FLASH_THEME = {
  name: 'tattoo-flash-theme-extraction',
  version: 'v1.0-flash-theme',
  systemInstruction:
    'You are a tattoo style analysis engine. Examine the attached tattoo design and extract its reusable style and motif DNA as a JSON object. Output only valid JSON — no markdown, no commentary, no backticks. Every field must be grounded in what is directly visible in the image.',
  prompt: FLASH_THEME_EXTRACTION_PROMPT,
} as const;

export default FLASH_THEME_EXTRACTION_PROMPT;
