export const PHASE_4A_STENCIL_PREP = String.raw`PHASE 4A - STENCIL PREP / LINEWORK

TOOL ROUTING - HARD
- Operation type: image-to-image generation.
- The attached base design image is mandatory.
- DESIGN ID is absolute. No redesign allowed.
- This phase extracts clean, high-contrast linework for physical stencil application.
- If shading, texture, or painterly marks are present in the output: FAIL.

MISSION
- Produce a clean, vectorized-style line drawing from a finished tattoo design.
- Preserve the exact composition and silhouette of the base image.
- Isolate the structural "blueprint" of the design.

STENCIL PRIORITY ORDER
- Preserve the approved design identity.
- Preserve major silhouette and readable line structure.
- Preserve tattoo-readable internal detail.
- Convert shading into stencil-safe linework, stipple, or clean black/white separation.
- Remove non-design artifacts.
- Keep transfer usability higher priority than microscopic detail.

STENCIL RULES - ABSOLUTE
- Background: Solid white (#FFFFFF).
- Lines: Solid black (#000000).
- No midtones: Only binary black and white.
- No shading: No whip shading, no gradients, no grey-wash simulations.
- No texture: No paper texture, no skin texture, no brush jitter.
- No background texture or environment artifacts.
- Keep line paths clear and printable.
- Preserve intentional negative space.

LINE HIERARCHY
- Outlines: Bold, continuous, and closed.
- Interior details: Thinner lines for secondary forms.
- Landmarks: Preserve all signature forms from the DESIGN ID.

FAIL CONDITIONS
- Missing base image.
- Presence of any color or grey shading.
- Broken or incomplete outlines.
- Addition of new design elements.
- Loss of identity lock or silhouette anchors.

OUTPUT
- A single high-contrast black and white linework image.
- Must be ready for immediate thermal stencil printing.`;

export const TATTOO_PHASE_4A = {
  name: 'tattoo-phase-4a-stencil-prep',
  version: 'v2.4-studio-stencil',
  buildPrompt(args: {
    designIdLock: string;
  }) {
    return [
      PHASE_4A_STENCIL_PREP,
      '',
      'DESIGN LOCK:',
      args.designIdLock,
    ].join('\n');
  },
} as const;

export default PHASE_4A_STENCIL_PREP;
