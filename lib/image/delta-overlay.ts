/**
 * delta-overlay.ts — Client-side delta overlay utilities.
 *
 * IMPORTANT: This module uses browser Canvas APIs and MUST only run client-side.
 * Do NOT import from any Node API route handler.
 *
 * Provides:
 *   - createDeltaOverlay: creates a transparent image showing only pixels that differ
 *     between a base image and an edited image.
 *   - bakeDeltaIntoBase: composites a delta overlay onto a base image.
 *   - validateMaskDrift: checks whether edits stayed within the painted mask region.
 */

/** Result of a delta overlay computation */
export interface DeltaOverlayResult {
  /** PNG data URL of the transparent overlay (only changed pixels are opaque) */
  dataUrl: string;
  /** Number of pixels that changed */
  changedPixels: number;
  /** Total pixel count */
  totalPixels: number;
  /** Fraction of pixels changed (0–1) */
  changeFraction: number;
}

/** Result of mask drift validation */
export interface MaskDriftResult {
  /** True when the edit altered pixels outside the mask beyond the allowed tolerance */
  drifted: boolean;
  /** Fraction of changed pixels that fell outside the mask (0–1) */
  outsideMaskFraction: number;
  /** Artist-facing message when drift is detected */
  message: string | null;
}

const CHANGE_THRESHOLD = 16; // per-channel delta to count a pixel as changed
const DRIFT_TOLERANCE = 0.05; // allow up to 5% of changed pixels outside mask

/**
 * Load an image URL into an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Draw an image to a canvas and return its ImageData.
 */
function toImageData(img: HTMLImageElement): { canvas: HTMLCanvasElement; data: ImageData } {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D context');
  ctx.drawImage(img, 0, 0);
  return { canvas, data: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

/**
 * Create a transparent delta-only overlay between a base and an edited image.
 * Both images must share the same dimensions.
 *
 * Changed pixels are copied from the edited image with full opacity.
 * Unchanged pixels are fully transparent.
 */
export async function createDeltaOverlay(
  baseUrl: string,
  editedUrl: string,
): Promise<DeltaOverlayResult> {
  const [baseImg, editedImg] = await Promise.all([loadImage(baseUrl), loadImage(editedUrl)]);

  const width = baseImg.naturalWidth;
  const height = baseImg.naturalHeight;

  if (editedImg.naturalWidth !== width || editedImg.naturalHeight !== height) {
    throw new Error(
      `Dimension mismatch: base is ${width}×${height}, edited is ${editedImg.naturalWidth}×${editedImg.naturalHeight}`,
    );
  }

  const { data: baseData } = toImageData(baseImg);
  const { canvas: editedCanvas, data: editedData } = toImageData(editedImg);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Could not get output 2D context');

  const outData = outCtx.createImageData(width, height);
  let changedPixels = 0;
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const base = i * 4;
    const dr = Math.abs(baseData.data[base] - editedData.data[base]);
    const dg = Math.abs(baseData.data[base + 1] - editedData.data[base + 1]);
    const db = Math.abs(baseData.data[base + 2] - editedData.data[base + 2]);

    if (dr > CHANGE_THRESHOLD || dg > CHANGE_THRESHOLD || db > CHANGE_THRESHOLD) {
      outData.data[base] = editedData.data[base];
      outData.data[base + 1] = editedData.data[base + 1];
      outData.data[base + 2] = editedData.data[base + 2];
      outData.data[base + 3] = 255;
      changedPixels++;
    }
    // else: transparent (already 0)
  }

  outCtx.putImageData(outData, 0, 0);

  // We no longer need the edited canvas reference after this
  void editedCanvas;

  return {
    dataUrl: outCanvas.toDataURL('image/png'),
    changedPixels,
    totalPixels,
    changeFraction: changedPixels / totalPixels,
  };
}

/**
 * Bake a delta overlay onto a base image.
 * Returns a PNG data URL of the composited result.
 */
export async function bakeDeltaIntoBase(
  baseUrl: string,
  overlayUrl: string,
): Promise<string> {
  const [baseImg, overlayImg] = await Promise.all([loadImage(baseUrl), loadImage(overlayUrl)]);

  const canvas = document.createElement('canvas');
  canvas.width = baseImg.naturalWidth;
  canvas.height = baseImg.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  ctx.drawImage(baseImg, 0, 0);
  ctx.drawImage(overlayImg, 0, 0);

  return canvas.toDataURL('image/png');
}

/**
 * Validate that an edit (described by a delta overlay) did not drift
 * outside the painted mask region beyond the allowed tolerance.
 *
 * @param deltaOverlayUrl  Transparent PNG from createDeltaOverlay
 * @param maskUrl          Painted mask PNG — white/opaque = masked area
 * @returns MaskDriftResult
 */
export async function validateMaskDrift(
  deltaOverlayUrl: string,
  maskUrl: string,
): Promise<MaskDriftResult> {
  const [deltaImg, maskImg] = await Promise.all([
    loadImage(deltaOverlayUrl),
    loadImage(maskUrl),
  ]);

  const width = deltaImg.naturalWidth;
  const height = deltaImg.naturalHeight;

  const { data: deltaData } = toImageData(deltaImg);
  const { data: maskData } = toImageData(maskImg);

  let changedCount = 0;
  let outsideMaskCount = 0;
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const base = i * 4;
    const isChanged = deltaData.data[base + 3] > 0; // alpha > 0 = changed pixel
    if (!isChanged) continue;
    changedCount++;

    // Mask: white (high luminance) or high alpha = inside mask
    const maskAlpha = maskData.data[base + 3];
    const maskLuma =
      0.299 * maskData.data[base] +
      0.587 * maskData.data[base + 1] +
      0.114 * maskData.data[base + 2];
    const insideMask = maskAlpha > 64 || maskLuma > 64;
    if (!insideMask) outsideMaskCount++;
  }

  if (changedCount === 0) {
    return { drifted: false, outsideMaskFraction: 0, message: null };
  }

  const outsideMaskFraction = outsideMaskCount / changedCount;
  const drifted = outsideMaskFraction > DRIFT_TOLERANCE;

  return {
    drifted,
    outsideMaskFraction,
    message: drifted
      ? 'Edit drifted outside the masked area. Tighten the mask or run as a direct edit.'
      : null,
  };
}
