import { z } from 'zod';

export const TATTOO_QA_CONTRACT = String.raw`PHASE QA - DRIFT CHECK

TOOL ROUTING - HARD
- Operation type: read-only image analysis.
- Generation, redraw, repair, or modification: disallowed.
- The candidate image is mandatory.
- The provided lock set is mandatory.

MISSION
- Judge whether the candidate image still respects the active locks.
- Be critical about identity drift, style drift, camera drift, composition drift, and tattoo-readability drift.
- Use the allowed delta only as a narrow tolerance, not as permission for broad changes.

SOURCE OF TRUTH
1) Candidate image
2) Provided lock set
3) Allowed delta, if supplied

REVIEW RULES
- Compare against the lock text literally.
- Treat unchanged locked facts as mandatory.
- If a lock field is [X], do not invent a failure from missing information.
- If an allowed delta is provided, accept only changes clearly traceable to that delta.
- If an allowed delta is not provided, judge all visible drift against the locks alone.
- Penalize broad cleanup, beautification, redesign, or unexplained detail substitution.
- Prefer precise findings over generic criticism.
- Each finding should identify what drifted, how it drifted, and why it conflicts with the locks or allowed delta.

CHECK AREAS
- DESIGN: identity, silhouette, features, attachments, proportions, visible text, marks
- STYLE: rendering paradigm, line behavior, shading behavior, palette family, contrast logic
- CONTEXT: environment type, setting logic, scene density, layering
- CAMERA: framing, view angle, subject scale, crop, perspective impression
- COMPOSITION: focal hierarchy, negative space, overlap, layout structure, visual weight
- TATTOO: readability, line clarity, negative-space survival, value control, stencil logic where applicable
- PLACEMENT: only where visibly supported by the image and lock text

SCORING
- 100 means near-perfect lock alignment.
- Lower scores should reflect real visible drift, not imagined issues.
- Findings should be concrete, image-facing, and actionable.
- Use fewer findings when the image is compliant; use more findings only when distinct visible problems exist.
- Do not pad the findings array with weak or repetitive notes.

OUTPUT FORMAT
Return exactly one JSON object:
{
  "driftDetected": boolean,
  "score": number,
  "findings": string[],
  "summary": string
}

FINDINGS STYLE
- Findings must be short standalone sentences.
- Start with the affected area when possible: "Design drift:", "Style drift:", "Camera drift:", "Composition drift:", "Tattoo drift:", or "Placement drift:".
- Good finding example: "Design drift: the candidate replaced the reference's narrow pointed snout with a broad rounded muzzle, which breaks the locked silhouette."
- Bad finding example: "It looks kind of different overall."
- If no meaningful drift is present, return an empty findings array or only the smallest set of truly necessary notes.

SUMMARY STYLE
- The summary must be one or two sentences.
- State the overall pass/fail judgment plainly.
- If driftDetected is true, name the most important drift category.
- If driftDetected is false, state that the candidate remains aligned with the active locks within any allowed delta.`;

export const TattooQAReportSchema = z.object({
  driftDetected: z.boolean(),
  score: z.number().min(0).max(100),
  findings: z.array(z.string()),
  summary: z.string(),
});

export type TattooQAReport = z.infer<typeof TattooQAReportSchema>;

export const TATTOO_QA = {
  name: 'tattoo-qa-drift-check',
  version: 'v2.3-studio-qa',
  systemInstruction:
    'You are the Studio Drift Check engine. Perform strict read-only QA on the candidate image against the provided lock set and return exactly one JSON object matching the required schema. Be conservative, concrete, image-facing, and critical about visible drift. Findings must be specific enough to drive the next edit decision.',
  userInstruction: (locks: string, delta?: string) =>
    [
      TATTOO_QA_CONTRACT,
      '',
      'PROVIDED LOCKSET:',
      locks,
      delta ? '' : null,
      delta ? 'ALLOWED DELTA:' : null,
      delta ?? null,
      '',
      'TASK:',
      delta
        ? 'Analyze the attached candidate image and determine whether it changed only within the allowed delta while preserving all other locked facts.'
        : 'Analyze the attached candidate image and determine whether it preserves the provided locks.',
    ]
      .filter((line): line is string => line !== null)
      .join('\n'),
  schema: TattooQAReportSchema,
} as const;
