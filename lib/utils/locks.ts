/**
 * Lock block parser — v4.0-tattoo-first
 *
 * Parses the 5-section output of Phase 1A into the existing 7-column DB schema.
 *
 * Column mapping (repurposed for tattoo-first structure):
 *   design_id_lock      → DESIGN ID (lock)
 *   style_id_lock       → STYLE ID (lock)
 *   tattoo_id_lock      → TATTOO SUBJECT ID (lock)
 *   placement_id_lock   → PLACEMENT ID (lock)
 *   context_id_lock     → STENCIL READABILITY ID (lock)
 *   camera_id_lock      → [N/A] — not used in tattoo-first extraction
 *   composition_id_lock → [N/A] — not used in tattoo-first extraction
 */

export interface ParsedLocks {
  designIdLock: string;
  styleIdLock: string;
  contextIdLock: string;       // STENCIL READABILITY ID
  cameraIdLock: string;        // [N/A]
  compositionIdLock: string;   // [N/A]
  tattooIdLock: string;        // TATTOO SUBJECT ID
  placementIdLock: string;     // PLACEMENT ID
  raw: string;
}

const SECTION_HEADERS = [
  { header: 'DESIGN ID (lock)',            key: 'designIdLock'      },
  { header: 'STYLE ID (lock)',             key: 'styleIdLock'       },
  { header: 'TATTOO SUBJECT ID (lock)',    key: 'tattooIdLock'      },
  { header: 'PLACEMENT ID (lock)',         key: 'placementIdLock'   },
  { header: 'STENCIL READABILITY ID (lock)', key: 'contextIdLock'  },
] as const;

type LockKey = keyof Omit<ParsedLocks, 'raw'>;

export function parseLockBlocks(lockText: string): ParsedLocks {
  const normalized = lockText.trim();

  // Find position of each section header
  const positions = SECTION_HEADERS.map(({ header, key }) => {
    // Match with optional numbering prefix: "1. ", "1) ", "## 1) ", etc.
    const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(?:#{1,3}\\s*)?(?:\\d+[\\.\\)]\\s+)?${escaped}`,
      'i',
    );
    const match = normalized.match(regex);
    return { key, index: match?.index ?? -1 };
  });

  const found = positions
    .filter(p => p.index !== -1)
    .sort((a, b) => a.index - b.index);

  if (found.length === 0) {
    throw new Error(
      `Phase 1A output contains no recognised sections. ` +
      `Expected: ${SECTION_HEADERS.map(h => h.header).join(', ')}. ` +
      `Check that the model returned a valid 5-section extraction.`,
    );
  }

  const result: Partial<Record<LockKey, string>> = {
    cameraIdLock:      '[N/A] — not applicable in tattoo-first extraction',
    compositionIdLock: '[N/A] — not applicable in tattoo-first extraction',
  };

  found.forEach((entry, idx) => {
    const end = idx < found.length - 1 ? found[idx + 1].index : normalized.length;
    let content = normalized.slice(entry.index, end).trim();
    // Strip trailing section separators
    content = content.replace(/\n?---\s*$/, '').trim();
    result[entry.key as LockKey] = content;
  });

  // Default any missing sections to [X]
  for (const { key } of SECTION_HEADERS) {
    if (!result[key as LockKey]) {
      result[key as LockKey] = `${key}\n[X]`;
    }
  }

  return {
    designIdLock:      result.designIdLock      ?? '[X]',
    styleIdLock:       result.styleIdLock       ?? '[X]',
    contextIdLock:     result.contextIdLock     ?? '[X]',
    cameraIdLock:      result.cameraIdLock      ?? '[N/A]',
    compositionIdLock: result.compositionIdLock ?? '[N/A]',
    tattooIdLock:      result.tattooIdLock      ?? '[X]',
    placementIdLock:   result.placementIdLock   ?? '[X]',
    raw: normalized,
  };
}

/**
 * Extract just the CORE block from a lock section for downstream injection.
 * Used by 1B and 1C to inject minimal, high-signal lock content.
 */
export function extractCore(lockSection: string): string {
  const coreMatch = lockSection.match(
    /(?:DESIGN IDENTITY CORE|STYLE IDENTITY CORE|TATTOO SUBJECT CORE|PLACEMENT CORE|STENCIL READABILITY CORE)[:\s]*([\s\S]+?)(?:\n---|\n##|$)/i,
  );
  return coreMatch?.[1]?.trim() ?? lockSection;
}
