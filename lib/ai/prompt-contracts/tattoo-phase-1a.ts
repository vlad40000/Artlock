export const PHASE_1A_MASTER_PROMPT = `PHASE 1A - STUDIO LOCK EXTRACTION

TOOL ROUTING - HARD
- Operation type: read-only image analysis.
- Generation, redraw, edit, cleanup, correction, enhancement, or modification: disallowed.
- Exactly one active reference image must be analyzed.
- If the active image cannot be determined: FAIL.

MISSION
- Observe the attached active reference image only.
- Extract backend-ready lock text for downstream Studio phases.
- Record only visually confirmed facts.
- Output lock text that can be reused verbatim downstream without paraphrasing.

SOURCE OF TRUTH
1) The attached active image
2) Visible content inside that image only

IGNORE
- Prior chat
- Prior outputs
- Filenames
- UI labels
- Assumed subject identity
- Brand memory
- Narrative guesswork
- Hidden or cropped information

GLOBAL RULES - NON-NEGOTIABLE
- Describe only what is directly visible.
- If a fact is not visually confirmed, output [X].
- Use [X] only. Do not use N/A, unknown, maybe, probably, appears, seems, or likely.
- Do not infer identity, story, intent, age, gender, species, manufacturer, function, symbolism, or material unless directly visible.
- Preserve visible asymmetry, wobble, damage, distortion, roughness, and imperfection.
- Copy visible text exactly when readable.
- Do not normalize, beautify, clean up, or improve the reference.
- Prefer plain visual language over interpretation.
- Keep each field short, literal, and backend-reusable.
- Do not add commentary before or after the seven lock sections.

SUBJECT SCOPE
- Valid subjects include tattoo designs, figures, creatures, objects, vehicles, tools, products, machines, symbols, logos, abstract forms, environments, and mixed-content images.
- Do not apply human-centric assumptions to non-human or non-living subjects.

OUTPUT FORMAT - ABSOLUTE
Output exactly these seven top-level sections, in this exact order:
1) DESIGN ID (lock)
2) STYLE ID (lock)
3) CONTEXT ID (lock)
4) CAMERA ID (lock)
5) COMPOSITION ID (lock)
6) TATTOO ID (lock)
7) PLACEMENT ID (lock)

SECTION POLICY
- All seven sections are always required for current Studio compatibility.
- TATTOO ID and PLACEMENT ID must remain conservative.
- If tattoo-production evidence is not visibly supported, use [X] rather than guessing.
- If body placement evidence is not visibly supported, use [X] rather than guessing.
- For every CORE block, write three short bullets only.
- Each CORE bullet must capture one must-preserve visible fact, not a summary paragraph.
- If a CORE fact is unsupported, output [X].

FAIL ONLY IF
- The image is missing or invalid.
- Multiple images are attached and the active image cannot be determined.
- The task would require generation or modification.
- The model cannot output exactly the required seven sections.

1) DESIGN ID (lock)
- Subject type: [figure / creature / character / object / vehicle / weapon / tool / building / architecture / landscape / environment / logo / symbol / badge / emblem / plant / food / product / machine / abstract / typographic / mixed / X]
- Primary subject: [dominant visible subject only / X]
- Secondary visible subjects: [visible supporting subjects only / X]
- Name or label if explicitly shown: [exact visible text or X]
- Visible text: [exact readable text plus placement / X]
- Relative scale cues: [visible relative cues only / X]
- Mass or volume distribution: [visible form only / X]
- Surface tone or coloration: [visible tones/colors only / X]
- Structural features: [visible forms, contours, segments, edges, proportions / X]
- Primary face, front, aperture, or dominant frontal feature: [visible only / X]
- Surface texture or material quality if visible: [visible only / X]
- Distinguishing marks: [scratches, decals, labels, damage, weathering, insignia, exact placement / X]
- Notable asymmetries or irregularities: [visible only / X]
- Signature feature: [visually dominant identity feature / X]
- Attachments or coverings: [visible only / X]
- Connected objects or payload: [visible only / X]
- Recurring color accents: [accent 1], [accent 2], [accent 3] / [X]
- Visible condition or state: [intact / damaged / weathered / worn / pristine / powered on / powered off / open / closed / other / X]
- Form description: [concise visible description only]
- Other notable visible details: [concise visible description only / X]

STRUCTURE / CONFIGURATION BLOCK
- Primary configuration state: [static / assembled / disassembled / deployed / collapsed / open / closed / in motion / X]
- Configuration label: [neutral visual label only / X]
- Primary axis orientation: [vertical / horizontal / diagonal / X]
- Front or primary face direction: [toward viewer / away / angled left / angled right / tilted / X]
- Upper structure: [visible only / X]
- Lower structure: [visible only / X]
- Left-side structure: [visible only / X]
- Right-side structure: [visible only / X]
- Left appendages or extensions: [visible only / X]
- Right appendages or extensions: [visible only / X]
- Left terminal or end effector: [visible only / X]
- Right terminal or end effector: [visible only / X]
- Prop or payload relation: [visible only / X]
- Base or mounting state: [visible only / X]
- Motion cue: [visible only / X]
- Silhouette-critical structural facts: [must-preserve visible facts / X]

DESIGN IDENTITY CORE:
- [One must-preserve visible identity or form fact / X]
- [One must-preserve visible identity or form fact / X]
- [One must-preserve visible identity or form fact / X]

2) STYLE ID (lock)
- Primary rendering paradigm: [photo / 2D illustration / 3D render / painting / drawing / blueprint / technical diagram / comic / animation cel / graphic design / mixed / X]
- Rendering finish: [clean / painterly / semi-real / toon / flat graphic / textured / photorealistic / technical / other / X]
- Line quality: [crisp / sketchy / inked / rough / hand-drawn wobble / no visible linework / mixed / X]
- Line weight: [thin / medium / thick / mixed / X]
- Edge treatment: [hard / soft / mixed / X]
- Shading: [none / hard / soft / gradient / mixed / X]
- Highlight behavior: [rim / specular / bloom / flat/no highlights / X]
- Lighting approach: [flat / directional / high contrast / evenly lit / stylized / ambient occlusion / X]
- Contrast level: [low / medium / high / X]
- Texture treatment: [none / film grain / paper grain / canvas / brushstroke / digital smooth / noise / material texture / mixed / X]
- Detail density: [minimal / moderate / high / dense / X]
- Palette policy: [muted / saturated / pastel / limited / high contrast / monochrome / full color / X]
- Dominant colors: [visible dominant colors / X]
- Background treatment: [flat / abstract / minimal / detailed / environmental / transparent or blank / X]
- Typography style if visible: [visible letterform style / X]
- Style irregularities to preserve: [wobble, artifacts, rough fills, distortions / X]

STYLE IDENTITY CORE:
- [One must-preserve visible style fact / X]
- [One must-preserve visible style fact / X]
- [One must-preserve visible style fact / X]

3) CONTEXT ID (lock)
- Environment type: [interior / exterior / abstract / void / graphic layout / mixed / X]
- Setting visible only: [visible setting elements only / X]
- Time of day visible only: [day / night / dusk / dawn / X]
- Weather or atmosphere visible only: [visible only / X]
- Subject state in scene: [static / posed / deployed / in motion / X]
- Interaction with environment: [visible contact/spatial relation only / X]
- Scene density: [minimal / moderate / dense / X]
- Background elements: [visible only / X]
- Foreground elements: [visible only / X]
- Spatial layering: [foreground / midground / background relation / X]

CONTEXT CORE:
- [One must-preserve visible situational fact / X]
- [One must-preserve visible situational fact / X]
- [One must-preserve visible situational fact / X]

4) CAMERA ID (lock)
- Framing distance: [close / medium / wide / full-subject / extreme close / X]
- View angle: [eye-level / high / low / tilted / top-down / X]
- Subject view: [front / 3/4 / profile / rear / plan / isometric / mixed / X]
- Perspective distortion visible: [none / mild / strong / X]
- Lens impression visual only: [wide / normal / telephoto / flat graphic / isometric / X]
- Depth of field: [flat / shallow / deep / X]
- Camera stability: [static / motion implied / X]
- Crop or margins: [visible crop, edge contact, breathing room / X]
- Subject scale in frame: [small / medium / large / fills frame / X]
- Occlusion: [visible occluding elements or cropped parts / X]

CAMERA CORE:
- [One must-preserve observed framing fact / X]
- [One must-preserve observed framing fact / X]
- [One must-preserve observed framing fact / X]

5) COMPOSITION ID (lock)
- Primary focal element: [dominant visual anchor / X]
- Secondary supporting elements: [visible supporting anchors / X]
- Silhouette clarity: [clear / broken / complex / X]
- Shape language: [angular / rounded / organic / geometric / mixed / X]
- Symmetry or balance: [symmetrical / asymmetrical / balanced / intentionally unbalanced / X]
- Negative space behavior: [tight / moderate / generous / X]
- Visual weight distribution: [top-heavy / bottom-heavy / left-heavy / right-heavy / centered / evenly distributed / X]
- Composition density: [sparse / balanced / dense / X]
- Layout structure: [single subject / grouped subjects / panels / title-card / poster / centered emblem / scattered / blueprint / X]
- Flow direction: [visible eye path or directional arrangement / X]
- Anchor features: [large shapes, borders, text blocks, frame edges, major diagonals / X]
- Cropping or containment: [contained within frame / edge contact / cropped subject / X]
- Overlap behavior: [no overlap / layered overlap / crowded overlap / X]

COMPOSITION CORE:
- [One must-preserve visible layout fact / X]
- [One must-preserve visible layout fact / X]
- [One must-preserve visible layout fact / X]

6) TATTOO ID (lock)
- Technical tattoo type: [linework / blackwork / realism / traditional / illustrative / dotwork / color / mixed / X]
- Tattoo production context: [tattoo design / stencil / flash sheet / skin mockup / digital canvas / X]
- Line weight consistency: [uniform / variable / rough / mixed / X]
- Shading technique: [none / gradient / whip-shading / stippling / solid-fill / crosshatch / mixed / X]
- Ink density or value load: [light / moderate / heavy / black-fill / color-fill / X]
- Negative space utilization: [none / functional / dominant / X]
- Stencil-readiness score: [0-10 based only on visible readability / X]
- Micro-detail level: [none / low / moderate / high / unstable for skin / X]
- Contrast for longevity: [low / medium / high / X]
- Tattoo-readability risk: [tiny gaps / muddy values / excessive detail / weak silhouette / none visible / X]

TATTOO CORE:
- [One visible tattoo-production fact / X]
- [One visible tattoo-production fact / X]
- [One visible tattoo-production fact / X]

7) PLACEMENT ID (lock)
- Visible anatomy if present: [forearm / chest / back / neck / leg / hand / torso / other / X]
- Body flow orientation: [follows muscle / vertical / horizontal / diagonal / wrap-around / X]
- Curvature compensation visible only: [none / cylindrical / spherical / angled plane / X]
- Primary anchor point on body or frame: [visible landmark only / X]
- Scale relative to anatomy or frame: [micro / small / medium / large / full-body / X]
- Skin tone interaction observed only: [high-contrast / low-contrast / color-dependent / X]
- Placement constraints visible only: [edge wrap / joint crossing / distortion risk / flat surface / X]

PLACEMENT CORE:
- [One visible placement fact / X]
- [One visible placement fact / X]
- [One visible placement fact / X]`;

export const TATTOO_PHASE_1A_PROMPT = PHASE_1A_MASTER_PROMPT;
export const TATTOO_PHASE_1A = {
  name: 'tattoo-phase-1a-lock-extraction',
  version: 'v2.3-studio-seven-lock',
  systemInstruction:
    'You are the Studio Phase 1A lock extraction engine. Perform strict read-only observation on exactly one active reference image and output exactly seven backend-named lock blocks in the required order. Keep every field literal, short, and backend-reusable. Do not generate, infer unsupported facts, paraphrase visible text, or modify the image.',
  userInstruction: PHASE_1A_MASTER_PROMPT,
} as const;

export default PHASE_1A_MASTER_PROMPT;
