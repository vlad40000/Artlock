/**
 * surgical-warning.ts — Generates UI warnings for Surgical Edit drift and missing targets.
 */

export type SurgicalWarningInput = {
  maskProvided: boolean;
  maskBBoxExists?: boolean;
  targetRegion: string | null | undefined;
  driftOutsideMask?: boolean;
  driftOutsideTarget?: boolean;
};

/**
 * Get a user-facing warning message based on the state of the surgical edit.
 */
export function getSurgicalWarning(input: SurgicalWarningInput): string | null {
  const target = typeof input.targetRegion === 'string' ? input.targetRegion.trim().toLowerCase() : '';
  
  const missingTarget = 
    !target || 
    target === '[x]' || 
    target === 'x' || 
    target === 'none' || 
    target === 'null' || 
    target === 'undefined';

  // 1. Missing target and no mask
  if (missingTarget && !input.maskProvided) {
    return 'Target region is missing. Select a region, describe the target, or add a mask.';
  }

  // 2. Drift outside mask (if mask provided)
  if (input.maskProvided && input.driftOutsideMask) {
    return 'Edit drifted outside the masked area. Tighten the mask or run as a direct edit.';
  }

  // 3. Drift outside target region (if no mask provided)
  if (!input.maskProvided && input.driftOutsideTarget) {
    return 'Edit drifted outside the target region. Add a mask or narrow the target description.';
  }

  // 4. Stale/Empty mask warning
  if (input.maskProvided && !input.maskBBoxExists) {
    return 'The provided mask is empty or invalid. Paint a region or clear the mask.';
  }

  return null;
}
