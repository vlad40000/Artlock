export const PHASE_2C_TURNAROUND_MODEL_SHEET = String.raw`PHASE 2C - TURNAROUND / MODEL SHEET

TOOL ROUTING - HARD
- Operation type: image-to-image generation.
- A Base or approved image is mandatory.
- The active lock set is mandatory.
- This phase generates alternate views, not a redesign.
- If identity, style, or construction consistency cannot be preserved: FAIL.

MISSION
- Produce requested views of the same locked design.
- Keep construction, style, and recognizable identity stable across all views.
- Behave like a Studio turnaround/model-sheet tool, not a broad concept-art generator.

SOURCE OF TRUTH
1) Base or approved image
2) DESIGN ID
3) STYLE ID
4) Requested views
5) Requested layout

CANVAS / LAYOUT LOCK
- Use the requested output layout.
- Keep scale consistent across views.
- Keep subject span and silhouette logic consistent.
- Do not crop the subject.
- Do not add unrelated props, symbols, text, or background story elements.

IDENTITY / CONSTRUCTION LOCK - HARD
- Preserve subject identity and main silhouette anchors.
- Preserve major proportions, attachments, surface markings, and signature forms.
- Continue hidden-side construction conservatively from visible evidence only.
- Do not invent decorative systems, components, or redesign logic.

STYLE LOCK - HARD
- Preserve rendering paradigm.
- Preserve line behavior, shading behavior, contrast logic, and texture policy.
- Preserve palette family unless the current route explicitly demands a neutral sheet treatment.
- No style-family shift between views.

VIEW RULES
- Front: preserve front-facing construction logic.
- Side: preserve true profile logic.
- Rear: continue visible construction conservatively.
- Three-quarter: rotate the same design rather than redesigning it.
- Top/bottom/isometric: derive only what is needed to express the same locked subject.
- Exploded/component/state sheets are valid only when explicitly requested by the route input.

FAIL CONDITIONS
- Missing base image.
- Missing active lock set.
- Identity drift across views.
- Style drift across views.
- Inconsistent scale.
- Unrequested redesign of hidden areas.
- Added marks, props, or labels not supported by the base image or locks.

OUTPUT
- Return a single sheet or separate images as requested.
- All views must read as the same locked design.
- If exact consistency cannot be maintained, output FAIL.`;

export const TATTOO_PHASE_2C = {
  name: 'tattoo-phase-2c-turnaround-model-sheet',
  version: 'v2.2-studio-turnaround',
  buildPrompt(args: {
    views: string[];
    layout: 'single' | 'separate';
  }) {
    return [
      PHASE_2C_TURNAROUND_MODEL_SHEET,
      '',
      'REQUESTED VIEWS:',
      args.views.join(' / '),
      '',
      'REQUESTED LAYOUT:',
      args.layout === 'single' ? 'single sheet' : 'separate images',
    ].join('\n');
  },
} as const;

export default PHASE_2C_TURNAROUND_MODEL_SHEET;
