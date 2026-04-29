export const PHASE_5_MOCKUP_ON_SKIN = String.raw`PHASE 5 - SKIN MOCKUP / ANATOMICAL VISUALIZATION

TOOL ROUTING - HARD
- Operation type: image-to-image generation (compositing).
- The design asset image is mandatory.
- This phase maps the design onto realistic human skin and anatomy.
- Do not redesign the subject.

MISSION
- Place a locked tattoo design onto a requested body part.
- Simulate realistic ink-on-skin behavior: subtle distortion, skin texture integration, and lighting match.
- Provide a visualization for client approval on placement.

PLACEMENT RULES - ABSOLUTE
- Background: Neutral studio setting or realistic lifestyle background.
- Subject: Clean, well-lit human skin (various tones as requested or neutral).
- Anatomy: Accurately represent the requested body part (e.g., Forearm, Back, Chest).

MOCKUP OWNERSHIP - VISUALIZATION ONLY
- Mockup is for visualization, not design truth.
- The flat approved design remains the source of truth.
- Preserve the source perspective and proportions of the tattoo design.
- Do not invent new lines, ornaments, symbols, text, or decorative fill.

INK INTEGRATION
- The tattoo must look like it is IN the skin, not floating on top.
- Preserve the exact design from the source image.
- No "sticker" effect: match the curvature and volume of the body part.
- Match the light source of the skin environment.
- Do not overpack tiny details that would blur during transfer or tattooing.
- If detail is too small to stencil safely, simplify only that detail while preserving the design intent.

FAIL CONDITIONS
- Missing design asset.
- Design is unrecognizable or significantly altered.
- Anatomy is distorted or anatomically incorrect.
- Tattoo looks like a 2D overlay (sticker effect).
- Addition of unrelated props or distracting elements.

OUTPUT
- A single high-quality image showing the design on the requested anatomy.`;

export const TATTOO_PHASE_5 = {
  name: 'tattoo-phase-5-mockup-on-skin',
  version: 'v2.5-studio-mockup',
  buildPrompt(args: {
    placement: string;
    tattooMode?: boolean;
  }) {
    return [
      PHASE_5_MOCKUP_ON_SKIN,
      '',
      'REQUESTED PLACEMENT:',
      args.placement,
      '',
      'TATTOO MODE:',
      args.tattooMode ? 'Enabled (Natural ink behavior)' : 'Disabled',
    ].join('\n');
  },
} as const;

export default PHASE_5_MOCKUP_ON_SKIN;
