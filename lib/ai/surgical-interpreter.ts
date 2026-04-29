/**
 * surgical-interpreter.ts — Parses artist instructions to extract target regions.
 * Prevents ambiguous edits by enforcing explicit localization.
 */

export type SurgicalInstruction = {
  targetRegion: string | null;
  displayRegion: string | null;
  requiresMask: boolean;
  warnings: string[];
};

const EMPTY_TARGETS = new Set(['', '[x]', 'x', 'none', 'null', 'undefined']);

function clean(text: string) {
  return text.trim().toLowerCase();
}

/**
 * Interpret a surgical instruction to determine the intended edit region.
 */
export function interpretSurgicalInstruction(text: string): SurgicalInstruction {
  const raw = text ?? '';
  const normalized = clean(raw);
  const warnings: string[] = [];

  if (!normalized || EMPTY_TARGETS.has(normalized)) {
    return {
      targetRegion: null,
      displayRegion: null,
      requiresMask: false,
      warnings: ['No surgical instruction entered.'],
    };
  }

  // Face accessories
  const isFaceAccessory = /(glasses|eyeglasses|spectacles|fake nose|novelty nose|mustache|moustache|disguise|mask)/i.test(normalized);
  if (isFaceAccessory) {
    return {
      targetRegion: 'face-accessory area only: eye/glasses area, bridge/nose area, and upper-lip/mustache area',
      displayRegion: 'face accessory area',
      requiresMask: false,
      warnings,
    };
  }

  // Hair / Facial Hair
  const isHair = /(hair|bangs|sideburn|beard|eyebrow|brow)/i.test(normalized);
  if (isHair) {
    return {
      targetRegion: 'named hair or facial-hair region only',
      displayRegion: 'hair / facial hair',
      requiresMask: false,
      warnings,
    };
  }

  // Clothing
  const isShirt = /(shirt|collar|sleeve|clothing|floral|suit|jacket|top)/i.test(normalized);
  if (isShirt) {
    return {
      targetRegion: 'shirt/clothing region only',
      displayRegion: 'shirt / clothing',
      requiresMask: false,
      warnings,
    };
  }

  // Specific Body Parts
  const isArm = /(arm|bicep|shoulder|forearm|hand|wrist)/i.test(normalized);
  if (isArm) {
    return {
      targetRegion: 'arm/shoulder region only',
      displayRegion: 'arm / shoulder',
      requiresMask: false,
      warnings,
    };
  }

  // If no specific region can be determined, require a mask or a better description
  warnings.push('Target region could not be determined from the instruction. Add a mask or describe the target region (e.g., "glasses", "hair").');
  
  return {
    targetRegion: null,
    displayRegion: null,
    requiresMask: true,
    warnings,
  };
}
