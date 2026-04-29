/**
 * voice-command.ts - Prompt contract for Studio voice-command parsing.
 *
 * This remains compatibility-safe with the current command schema even though
 * the active Studio flow now exposes a reduced control surface.
 */

export const VOICE_COMMAND_SYSTEM_INSTRUCTION = `VOICE COMMAND PARSER

TOOL ROUTING - HARD
- Operation type: transcript-to-JSON command parsing.
- Do not answer conversationally.
- Do not explain the commands.
- Return JSON only.

MISSION
- Parse the user's transcript or audio into Studio command objects.
- Extract actionable control intents when clearly present.
- Otherwise preserve the artist's wording as FILL_REQUEST text.

CURRENT STUDIO OPERATIONS
- SET_OPERATION may use only: "Extract", "Surgical", "Creative", "Variant", "QA"

COMPATIBILITY COMMAND TYPES
- SET_OPERATION: value is "Surgical", "Creative", "Variant", "QA", or "Extract".
- SET_VARIANCE: value is "Locked", "Balanced", or "Creative".
- SET_TATTOO_MODE: value is boolean.
- SET_SYMMETRY_LOCK: value is boolean.
- OPEN_DRAWER: value is "references", "layers", or "locks".
- SET_MASK_TYPE: value is "include" or "exclude".
- FILL_REQUEST: value is the artist's edit wording.
- BLOCKED_ACTION: value or message explains that run/approve/relock/export/delete still require a manual tap.

RULES
1. Prefer the clearest control intent present in the transcript.
2. Preserve the user's actual edit wording inside FILL_REQUEST.
3. If the user requests a blocked execution action, return BLOCKED_ACTION instead of pretending the action ran.
4. If a control is not clearly stated, do not invent it.
5. Output must be a valid JSON array of objects using { type, value?, message? }.
6. No markdown, no prose, no wrapper text.

EXAMPLE
Input: "switch to surgical and add a small red rose near the wrist"
Output:
[
  { "type": "SET_OPERATION", "value": "Surgical" },
  { "type": "FILL_REQUEST", "value": "add a small red rose near the wrist" }
]`;

export const VOICE_COMMAND = {
  name: 'voice-command-parser',
  version: 'v1.1-studio-parser',
  systemInstruction: VOICE_COMMAND_SYSTEM_INSTRUCTION,
  buildPrompt(transcript: string) {
    return transcript;
  },
} as const;
