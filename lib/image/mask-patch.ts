/**
 * mask-patch.ts — Client-side mask patch utilities.
 *
 * IMPORTANT: This module uses browser Canvas APIs and MUST only run client-side.
 * Do NOT import from any Node API route handler.
 *
 * Supports hard-mask crop editing:
 *   - computeMaskBbox: returns the tight bounding box of opaque mask pixels
 *   - padBbox: pads a bounding box by a fixed amount, clamped to image bounds
 *   - cropImageToBox: crops an image data URL to a bounding box
 *   - createFullSizeMaskedPatch: places a patch back into a full-size transparent layer
 *   - bakemaskedPatchIntoBase: composites a masked patch into a base image
 */

export interface Bbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
 * Draw image to a canvas and return the canvas + ImageData.
 */
function toImageData(img: HTMLImageElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; data: ImageData } {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D context');
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx, data: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

/**
 * Compute the tight bounding box of opaque pixels in a mask image.
 * Returns null if the mask is entirely transparent.
 */
export async function computeMaskBbox(maskUrl: string): Promise<Bbox | null> {
  const maskImg = await loadImage(maskUrl);
  const { data } = toImageData(maskImg);
  const width = maskImg.naturalWidth;
  const height = maskImg.naturalHeight;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data.data[i + 3];
      const luma = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];
      if (alpha > 32 || luma > 32) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1 || maxY === -1) return null;

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Pad a bounding box by `padding` pixels on each side,
 * clamped to the given image dimensions.
 */
export function padBbox(
  bbox: Bbox,
  padding: number,
  imageWidth: number,
  imageHeight: number,
): Bbox {
  const x = Math.max(0, bbox.x - padding);
  const y = Math.max(0, bbox.y - padding);
  const right = Math.min(imageWidth, bbox.x + bbox.width + padding);
  const bottom = Math.min(imageHeight, bbox.y + bbox.height + padding);
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Crop an image (by URL) to a bounding box.
 * Returns a PNG data URL of the cropped region.
 */
export async function cropImageToBox(imageUrl: string, bbox: Bbox): Promise<string> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = bbox.width;
  canvas.height = bbox.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');
  ctx.drawImage(img, bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);
  return canvas.toDataURL('image/png');
}

/**
 * Create a full-size transparent patch layer from a cropped patch placed
 * back at the position defined by bbox. Pixels outside bbox are transparent.
 *
 * @param patchUrl  Cropped patch image (same size as bbox)
 * @param bbox      Where in the full image the patch belongs
 * @param fullWidth Full output image width
 * @param fullHeight Full output image height
 * @returns PNG data URL (full size, transparent outside patch region)
 */
export async function createFullSizeMaskedPatch(
  patchUrl: string,
  maskUrl: string,
  bbox: Bbox,
  fullWidth: number,
  fullHeight: number,
): Promise<string> {
  const [patchImg, maskImg] = await Promise.all([loadImage(patchUrl), loadImage(maskUrl)]);

  const canvas = document.createElement('canvas');
  canvas.width = fullWidth;
  canvas.height = fullHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  // Draw patch at bbox position
  ctx.drawImage(patchImg, bbox.x, bbox.y, bbox.width, bbox.height);

  // Apply mask alpha: pixels outside the mask become transparent
  const outData = ctx.getImageData(0, 0, fullWidth, fullHeight);
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = fullWidth;
  maskCanvas.height = fullHeight;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) throw new Error('Could not get mask 2D context');
  maskCtx.drawImage(maskImg, 0, 0, fullWidth, fullHeight);
  const maskData = maskCtx.getImageData(0, 0, fullWidth, fullHeight);

  for (let i = 0; i < fullWidth * fullHeight; i++) {
    const base = i * 4;
    const maskAlpha = maskData.data[base + 3];
    const maskLuma =
      0.299 * maskData.data[base] +
      0.587 * maskData.data[base + 1] +
      0.114 * maskData.data[base + 2];
    const insideMask = maskAlpha > 32 || maskLuma > 32;
    if (!insideMask) {
      outData.data[base + 3] = 0; // transparent outside mask
    }
  }

  ctx.putImageData(outData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Bake a masked patch into a base image.
 * The patch is composited over the base using `source-over`.
 * Pixels outside the patch's alpha are taken from the base.
 *
 * @returns PNG data URL of the composited result
 */
export async function bakeMaskedPatchIntoBase(
  baseUrl: string,
  patchUrl: string,
): Promise<string> {
  const [baseImg, patchImg] = await Promise.all([loadImage(baseUrl), loadImage(patchUrl)]);

  const canvas = document.createElement('canvas');
  canvas.width = baseImg.naturalWidth;
  canvas.height = baseImg.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  ctx.drawImage(baseImg, 0, 0);
  ctx.drawImage(patchImg, 0, 0); // composites using source-over

  return canvas.toDataURL('image/png');
}
