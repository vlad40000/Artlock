export interface ParsedLocks {
  designIdLock: string;
  styleIdLock: string;
  contextIdLock: string;
  cameraIdLock: string;
  compositionIdLock: string;
  tattooIdLock: string;
  placementIdLock: string;
  raw: string;
}

const LOCK_HEADERS = [
  'DESIGN ID (lock)',
  'STYLE ID (lock)',
  'CONTEXT ID (lock)',
  'CAMERA ID (lock)',
  'COMPOSITION ID (lock)',
  'TATTOO ID (lock)',
  'PLACEMENT ID (lock)',
] as const;

type LockKey =
  | 'designIdLock'
  | 'styleIdLock'
  | 'contextIdLock'
  | 'cameraIdLock'
  | 'compositionIdLock'
  | 'tattooIdLock'
  | 'placementIdLock';

const HEADER_TO_KEY: Record<(typeof LOCK_HEADERS)[number], LockKey> = {
  'DESIGN ID (lock)': 'designIdLock',
  'STYLE ID (lock)': 'styleIdLock',
  'CONTEXT ID (lock)': 'contextIdLock',
  'CAMERA ID (lock)': 'cameraIdLock',
  'COMPOSITION ID (lock)': 'compositionIdLock',
  'TATTOO ID (lock)': 'tattooIdLock',
  'PLACEMENT ID (lock)': 'placementIdLock',
};

export function parseLockBlocks(lockText: string): ParsedLocks {
  const normalized = lockText.trim();
  const lowerNormalized = normalized.toUpperCase();
  
  const positions = LOCK_HEADERS.map((header) => {
    // Try to find with common prefixes like "1. ", "1) ", or just the header
    const regex = new RegExp(`(?:\\d+[\\.\\)]\\s+)?${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    const match = normalized.match(regex);
    return {
      header,
      index: match ? match.index! : -1,
      matchedText: match ? match[0] : header
    };
  });

  const sortedFound = [...positions]
    .filter(p => p.index !== -1)
    .sort((a, b) => a.index - b.index);

  if (sortedFound.length === 0) {
    throw new Error('Lock output contains no recognized sections.');
  }

  const parsed = {} as Record<LockKey, string>;
  
  // Default all to [X]
  LOCK_HEADERS.forEach(h => {
    parsed[HEADER_TO_KEY[h]] = `${h}\n[X]`;
  });

  sortedFound.forEach((entry, idx) => {
    const start = entry.index;
    const end = idx < sortedFound.length - 1 ? sortedFound[idx + 1].index : normalized.length;
    let content = normalized.slice(start, end).trim();
    // Remove trailing separators if any
    if (content.endsWith('---')) content = content.slice(0, -3).trim();
    
    parsed[HEADER_TO_KEY[entry.header]] = content;
  });
  return { ...parsed, raw: normalized };
}
