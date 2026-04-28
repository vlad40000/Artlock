/**
 * generation-profiles.ts — Server-side runtime preset mapping.
 *
 * Artist-facing presets resolve to internal generation parameters.
 * The client sends a preset ID and safe numeric values only.
 * The server resolves temperature/topP — never exposed to the normal UI.
 * Raw systemInstruction text is never accepted from the client.
 */

export type GenerationPresetId =
  | 'lockStrict'
  | 'surgicalLocal'
  | 'surgicalBalanced'
  | 'creativeControlled'
  | 'creativeExpressive';

export interface GenerationProfile {
  id: GenerationPresetId;
  label: string;
  operationType: 'surgical' | 'creative';
  temperature: number;
  topP: number;
  /** Internal system instruction identifier — never sent to client */
  systemInstructionId: string;
  imageSize: '1024x1024' | '1536x1536' | 'source';
}

const PROFILES: Record<GenerationPresetId, GenerationProfile> = {
  lockStrict: {
    id: 'lockStrict',
    label: 'Lock Strict',
    operationType: 'surgical',
    temperature: 0.05,
    topP: 0.8,
    systemInstructionId: 'tattoo-phase-1b-strict',
    imageSize: 'source',
  },
  surgicalLocal: {
    id: 'surgicalLocal',
    label: 'Surgical Local',
    operationType: 'surgical',
    temperature: 0.1,
    topP: 0.85,
    systemInstructionId: 'tattoo-phase-1b-local',
    imageSize: 'source',
  },
  surgicalBalanced: {
    id: 'surgicalBalanced',
    label: 'Surgical Balanced',
    operationType: 'surgical',
    temperature: 0.15,
    topP: 0.9,
    systemInstructionId: 'tattoo-phase-1b-balanced',
    imageSize: 'source',
  },
  creativeControlled: {
    id: 'creativeControlled',
    label: 'Creative Controlled',
    operationType: 'creative',
    temperature: 0.25,
    topP: 0.9,
    systemInstructionId: 'tattoo-phase-1c-controlled',
    imageSize: 'source',
  },
  creativeExpressive: {
    id: 'creativeExpressive',
    label: 'Creative Expressive',
    operationType: 'creative',
    temperature: 0.4,
    topP: 0.95,
    systemInstructionId: 'tattoo-phase-1c-expressive',
    imageSize: 'source',
  },
};

/**
 * Resolve a preset ID to its full profile.
 * Returns null if the preset ID is not recognized.
 */
export function resolveGenerationProfile(presetId: string): GenerationProfile | null {
  return PROFILES[presetId as GenerationPresetId] ?? null;
}

/**
 * Server-side resolver: given an operation type and optional controls,
 * return the resolved profile. Uses explicit generationPresetId first,
 * then derives from operation + variancePreset.
 *
 * Routes call this with their known operation hardcoded:
 *   resolveFromControls({ operation: 'surgical', ... })
 */
export function resolveFromControls(controls: {
  operation: 'surgical' | 'creative';
  generationPresetId?: string | null;
  variancePreset?: string | null;
}): GenerationProfile {
  // 1. Explicit preset — validate it matches the operation type
  if (controls.generationPresetId) {
    const profile = resolveGenerationProfile(controls.generationPresetId);
    if (profile && profile.operationType === controls.operation) {
      return profile;
    }
    // If preset doesn't match operation, fall through to derive
  }

  // 2. Derive from operation + variance
  const variance = controls.variancePreset ?? 'Balanced';
  const presetId = derivePresetIdServer(controls.operation, variance);
  return PROFILES[presetId];
}

/**
 * Server-side preset derivation from operation type + variance.
 * Does not need mode (mode is a UI-only concept).
 */
function derivePresetIdServer(
  operation: 'surgical' | 'creative',
  variance: string,
): GenerationPresetId {
  switch (operation) {
    case 'surgical':
      // Creative variance in Surgical mode → mapped to loosest surgical (not full creative)
      if (variance === 'Locked') return 'lockStrict';
      if (variance === 'Creative') return 'surgicalBalanced';
      return 'surgicalLocal'; // Balanced default
    case 'creative':
      if (variance === 'Locked') return 'creativeControlled';
      if (variance === 'Creative') return 'creativeExpressive';
      return 'creativeControlled'; // Balanced default
  }
}

/**
 * Client-side preset derivation (used by studio-client to pass generationPresetId).
 * Maps from UI concepts (operation name, mode label, variance label) to preset ID.
 */
export function derivePresetId(
  operation: string,
  mode: string,
  variance: string,
): GenerationPresetId {
  if (operation === 'Creative' || operation === 'Variant') {
    return variance === 'Locked' ? 'creativeControlled' : variance === 'Creative' ? 'creativeExpressive' : 'creativeControlled';
  }

  // Surgical — derive from mode + variance
  switch (mode) {
    case 'Lock Strict':
      return 'lockStrict';
    case 'Surgical Local':
      return variance === 'Creative' ? 'surgicalBalanced' : 'surgicalLocal';
    case 'Creative':
      return 'creativeControlled';
    default:
      return 'surgicalLocal';
  }
}

/**
 * Map variance string to creative-delta intensity.
 */
export function varianceToIntensity(variance: string): 'low' | 'medium' | 'high' {
  switch (variance) {
    case 'Locked':
      return 'low';
    case 'Balanced':
      return 'medium';
    case 'Creative':
      return 'high';
    default:
      return 'medium';
  }
}

/**
 * Clamp numeric generation controls to safe server-side ranges.
 */
export function clampGenerationControls(controls: {
  designFidelity?: number;
  detailLoad?: number;
}) {
  return {
    designFidelity: Math.min(1, Math.max(0, controls.designFidelity ?? 0.85)),
    detailLoad: Math.min(1, Math.max(0, controls.detailLoad ?? 0.65)),
  };
}
