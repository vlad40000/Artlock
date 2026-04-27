import 'server-only';

import sharp from 'sharp';

const CHANGE_THRESHOLD = 16;
const MASK_THRESHOLD = 64;
const DRIFT_TOLERANCE = 0.05;

export const MASK_DRIFT_ERROR_MESSAGE =
  'Edit drifted outside the masked area. Tighten the mask or run as a direct edit.';

export interface ServerMaskDriftResult {
  drifted: boolean;
  dimensionsMatch: boolean;
  width: number | null;
  height: number | null;
  outsideMaskFraction: number;
  changedPixels: number;
  outsideMaskPixels: number;
  changedBounds: PixelBounds | null;
  outsideMaskBounds: PixelBounds | null;
  message: string | null;
}

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
}

export interface PixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function toRawRgba(buffer: Buffer): Promise<RawImage> {
  const { data, info } = await sharp(buffer, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
  };
}

function isPixelInsideMask(maskData: Buffer, offset: number) {
  const alpha = maskData[offset + 3];
  const luma =
    0.299 * maskData[offset] +
    0.587 * maskData[offset + 1] +
    0.114 * maskData[offset + 2];

  return alpha > MASK_THRESHOLD || luma > MASK_THRESHOLD;
}

function isChangedPixel(baseData: Buffer, editedData: Buffer, offset: number) {
  return (
    Math.abs(baseData[offset] - editedData[offset]) > CHANGE_THRESHOLD ||
    Math.abs(baseData[offset + 1] - editedData[offset + 1]) > CHANGE_THRESHOLD ||
    Math.abs(baseData[offset + 2] - editedData[offset + 2]) > CHANGE_THRESHOLD ||
    Math.abs(baseData[offset + 3] - editedData[offset + 3]) > CHANGE_THRESHOLD
  );
}

function createBoundsTracker() {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    seen: false,
  };
}

function trackPoint(
  tracker: ReturnType<typeof createBoundsTracker>,
  x: number,
  y: number,
) {
  tracker.seen = true;
  tracker.minX = Math.min(tracker.minX, x);
  tracker.minY = Math.min(tracker.minY, y);
  tracker.maxX = Math.max(tracker.maxX, x);
  tracker.maxY = Math.max(tracker.maxY, y);
}

function finalizeBounds(
  tracker: ReturnType<typeof createBoundsTracker>,
): PixelBounds | null {
  if (!tracker.seen) return null;
  return {
    x: tracker.minX,
    y: tracker.minY,
    width: tracker.maxX - tracker.minX + 1,
    height: tracker.maxY - tracker.minY + 1,
  };
}

export async function validateServerMaskDrift(args: {
  baseBuffer: Buffer;
  editedBuffer: Buffer;
  maskBuffer: Buffer;
}): Promise<ServerMaskDriftResult> {
  const [baseImage, editedImage, maskImage] = await Promise.all([
    toRawRgba(args.baseBuffer),
    toRawRgba(args.editedBuffer),
    toRawRgba(args.maskBuffer),
  ]);

  const dimensionsMatch =
    baseImage.width === editedImage.width &&
    baseImage.height === editedImage.height &&
    baseImage.width === maskImage.width &&
    baseImage.height === maskImage.height;

  if (!dimensionsMatch) {
    return {
      drifted: true,
      dimensionsMatch: false,
      width: baseImage.width,
      height: baseImage.height,
      outsideMaskFraction: 1,
      changedPixels: 0,
      outsideMaskPixels: 0,
      changedBounds: null,
      outsideMaskBounds: null,
      message: MASK_DRIFT_ERROR_MESSAGE,
    };
  }

  let changedPixels = 0;
  let outsideMaskPixels = 0;
  const totalPixels = baseImage.width * baseImage.height;
  const changedBounds = createBoundsTracker();
  const outsideMaskBounds = createBoundsTracker();

  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex++) {
    const offset = pixelIndex * 4;
    if (!isChangedPixel(baseImage.data, editedImage.data, offset)) {
      continue;
    }

    changedPixels += 1;
    const x = pixelIndex % baseImage.width;
    const y = Math.floor(pixelIndex / baseImage.width);
    trackPoint(changedBounds, x, y);
    if (!isPixelInsideMask(maskImage.data, offset)) {
      outsideMaskPixels += 1;
      trackPoint(outsideMaskBounds, x, y);
    }
  }

  if (changedPixels === 0) {
    return {
      drifted: false,
      dimensionsMatch: true,
      width: baseImage.width,
      height: baseImage.height,
      outsideMaskFraction: 0,
      changedPixels,
      outsideMaskPixels,
      changedBounds: null,
      outsideMaskBounds: null,
      message: null,
    };
  }

  const outsideMaskFraction = outsideMaskPixels / changedPixels;
  const drifted = outsideMaskFraction > DRIFT_TOLERANCE;

  return {
    drifted,
    dimensionsMatch: true,
    width: baseImage.width,
    height: baseImage.height,
    outsideMaskFraction,
    changedPixels,
    outsideMaskPixels,
    changedBounds: finalizeBounds(changedBounds),
    outsideMaskBounds: finalizeBounds(outsideMaskBounds),
    message: drifted ? MASK_DRIFT_ERROR_MESSAGE : null,
  };
}
