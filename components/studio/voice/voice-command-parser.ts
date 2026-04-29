/**
 * voice-command-parser.ts — Deterministic voice command parser.
 *
 * Parses transcribed voice text into structured Studio commands.
 * Voice can fill fields and switch controls but NEVER auto-runs
 * generation, approval, relock, export, or delete actions.
 */

export type VoiceCommandType =
  | 'SET_OPERATION'
  | 'SET_VARIANCE'
  | 'SET_TATTOO_MODE'
  | 'SET_SYMMETRY_LOCK'
  | 'OPEN_DRAWER'
  | 'FILL_REQUEST'
  | 'SET_MASK_TYPE'
  | 'TOGGLE_MASK'
  | 'BLOCKED_ACTION';


export interface VoiceCommand {
  type: VoiceCommandType;
  value?: string | number | boolean | { type: 'include' | 'exclude'; subject?: string };
  message?: string;
}

const OPERATION_ALIASES: Record<string, string> = {
  surgical: 'Surgical',
  surgery: 'Surgical',
  edit: 'Surgical',
  creative: 'Creative',
  create: 'Creative',
  variant: 'Variant',
  variants: 'Variant',
  flash: 'Variant',
  sheet: 'Variant',
  'variant sheet': 'Variant',
  'flash sheet': 'Variant',
  qa: 'QA',
  'quality check': 'QA',
  'drift check': 'QA',
  check: 'QA',
};

const VARIANCE_ALIASES: Record<string, string> = {
  locked: 'Locked',
  strict: 'Locked',
  balanced: 'Balanced',
  moderate: 'Balanced',
  creative: 'Creative',
  expressive: 'Creative',
  free: 'Creative',
};

const DRAWER_ALIASES: Record<string, string> = {
  references: 'references',
  reference: 'references',
  gallery: 'references',
  layers: 'layers',
  layer: 'layers',
  history: 'layers',
  outputs: 'layers',
  locks: 'locks',
  lock: 'locks',
};

const BLOCKED_PATTERNS = [
  /\b(run it|run edit|run delta|execute|go|start generation|generate)\b/i,
  /\b(approve|accept|confirm output)\b/i,
  /\b(relock|re-lock|re lock)\b/i,
  /\b(export|download|save final)\b/i,
  /\b(delete|remove|discard)\b/i,
];

/**
 * Parse a voice transcript into zero or more commands.
 * Returns commands in priority order. The first match wins for control changes.
 * Unmatched text is treated as FILL_REQUEST (appended to Client Request).
 */
export function parseVoiceCommand(transcript: string): VoiceCommand {
  const lower = transcript.toLowerCase().trim();

  // Check blocked actions first
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        type: 'BLOCKED_ACTION',
        message: 'Ready — tap Run to confirm.',
      };
    }
  }

  // Operation switches: "switch to surgical", "use creative mode", "surgical"
  const opMatch = lower.match(/(?:switch\s+to|use|set\s+(?:to\s+)?|mode\s+)?\s*(surgical|surgery|edit|creative|create|variant sheet|flash sheet|variants|variant|flash|sheet|qa|quality check|drift check|check)\s*(?:mode|operation)?/);
  if (opMatch) {
    const key = opMatch[1].trim();
    const mapped = OPERATION_ALIASES[key];
    if (mapped) {
      return { type: 'SET_OPERATION', value: mapped };
    }
  }

  // Variance: "set variance to locked", "balanced mode", "creative variance"
  const varMatch = lower.match(/(?:set\s+)?(?:variance\s+(?:to\s+)?|)?(locked|strict|balanced|moderate|creative|expressive|free)\s*(?:variance|mode)?/);
  if (varMatch && /variance|locked|strict|balanced|moderate|expressive|free/.test(lower)) {
    const key = varMatch[1].trim();
    const mapped = VARIANCE_ALIASES[key];
    if (mapped) {
      return { type: 'SET_VARIANCE', value: mapped };
    }
  }

  // Tattoo mode: "tattoo mode on", "disable tattoo mode"
  const tattooMatch = lower.match(/(?:tattoo\s+mode)\s*(on|off|enable|disable|true|false)/);
  if (tattooMatch) {
    const on = ['on', 'enable', 'true'].includes(tattooMatch[1]);
    return { type: 'SET_TATTOO_MODE', value: on };
  }
  if (/enable\s+tattoo|tattoo\s+on/.test(lower)) {
    return { type: 'SET_TATTOO_MODE', value: true };
  }
  if (/disable\s+tattoo|tattoo\s+off/.test(lower)) {
    return { type: 'SET_TATTOO_MODE', value: false };
  }

  // Symmetry lock: "symmetry on", "symmetry lock off"
  const symMatch = lower.match(/(?:symmetry\s*(?:lock)?)\s*(on|off|enable|disable|true|false)/);
  if (symMatch) {
    const on = ['on', 'enable', 'true'].includes(symMatch[1]);
    return { type: 'SET_SYMMETRY_LOCK', value: on };
  }
  if (/enable\s+symmetry|symmetry\s+on/.test(lower)) {
    return { type: 'SET_SYMMETRY_LOCK', value: true };
  }
  if (/disable\s+symmetry|symmetry\s+off/.test(lower)) {
    return { type: 'SET_SYMMETRY_LOCK', value: false };
  }



  // Drawer opens: "open references", "show layers", "locks"
  const drawerMatch = lower.match(/(?:open|show|view)\s+(references?|gallery|layers?|history|outputs|locks?)/);
  if (drawerMatch) {
    const key = drawerMatch[1].trim();
    const mapped = DRAWER_ALIASES[key];
    if (mapped) {
      return { type: 'OPEN_DRAWER', value: mapped };
    }
  }

  // Mask type: "mask within", "mask outside", "mask exclude", "mask the [area]"
  const maskTypeMatch = lower.match(/(?:mask\s+)?(within|inside|outside|exclude|including|excluding|the|this)\s*([a-z0-9\s]+)?/);
  if (maskTypeMatch && (lower.includes('mask') || ['within', 'outside', 'exclude'].some(k => lower.includes(k)))) {
    const key = maskTypeMatch[1];
    const subject = maskTypeMatch[2]?.trim();
    
    if (['within', 'inside', 'including'].includes(key)) {
      return { type: 'SET_MASK_TYPE', value: { type: 'include', subject } };
    }
    if (['outside', 'exclude', 'excluding'].includes(key)) {
      return { type: 'SET_MASK_TYPE', value: { type: 'exclude', subject } };
    }
    if (subject) {
      return { type: 'SET_MASK_TYPE', value: { type: 'include', subject } };
    }
  }

  // Toggle mask: "show mask", "hide mask", "enable mask"
  const maskToggleMatch = lower.match(/(?:show|hide|enable|disable|toggle)\s+mask/);
  if (maskToggleMatch || /mask\s+(?:on|off)/.test(lower)) {
    const isShow = /show|enable|on|toggle/.test(lower) && !/hide|disable|off/.test(lower);
    // Note: toggle is treated as show for simplicity in one-way voice commands
    return { type: 'TOGGLE_MASK', value: isShow };
  }

  // Default: treat entire transcript as client request text

  return { type: 'FILL_REQUEST', value: transcript.trim() };
}
