import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

vi.mock('server-only', () => ({}));

const width = 3;
const height = 1;

function rgbaPixel(r: number, g: number, b: number, a = 255) {
  return [r, g, b, a];
}

async function pngFromPixels(pixels: number[][]) {
  return sharp(Buffer.from(pixels.flat()), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function rawPixelsFromPng(buffer: Buffer) {
  const { data } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return Array.from(data);
}

describe('server mask drift handling', () => {
  it('clamps include-mask edits back to the painted area', async () => {
    const { clampEditToMask, validateServerMaskDrift } = await import(
      '@/lib/image/server-mask-drift'
    );
    const base = await pngFromPixels([
      rgbaPixel(0, 0, 0),
      rgbaPixel(0, 0, 0),
      rgbaPixel(0, 0, 0),
    ]);
    const edited = await pngFromPixels([
      rgbaPixel(255, 0, 0),
      rgbaPixel(255, 0, 0),
      rgbaPixel(0, 0, 0),
    ]);
    const mask = await pngFromPixels([
      rgbaPixel(255, 255, 255),
      rgbaPixel(0, 0, 0, 0),
      rgbaPixel(0, 0, 0, 0),
    ]);

    await expect(
      validateServerMaskDrift({ baseBuffer: base, editedBuffer: edited, maskBuffer: mask }),
    ).resolves.toMatchObject({ drifted: true, changedPixels: 2, outsideMaskPixels: 1 });

    const clamped = await clampEditToMask({
      baseBuffer: base,
      editedBuffer: edited,
      maskBuffer: mask,
    });

    await expect(
      validateServerMaskDrift({ baseBuffer: base, editedBuffer: clamped, maskBuffer: mask }),
    ).resolves.toMatchObject({ drifted: false, changedPixels: 1, outsideMaskPixels: 0 });
    await expect(rawPixelsFromPng(clamped)).resolves.toEqual([
      ...rgbaPixel(255, 0, 0),
      ...rgbaPixel(0, 0, 0),
      ...rgbaPixel(0, 0, 0),
    ]);
  });

  it('treats white exclude-mask pixels as locked', async () => {
    const { clampEditToMask, validateServerMaskDrift } = await import(
      '@/lib/image/server-mask-drift'
    );
    const base = await pngFromPixels([
      rgbaPixel(0, 0, 0),
      rgbaPixel(0, 0, 0),
      rgbaPixel(0, 0, 0),
    ]);
    const edited = await pngFromPixels([
      rgbaPixel(255, 0, 0),
      rgbaPixel(255, 0, 0),
      rgbaPixel(0, 0, 0),
    ]);
    const mask = await pngFromPixels([
      rgbaPixel(255, 255, 255),
      rgbaPixel(0, 0, 0, 0),
      rgbaPixel(0, 0, 0, 0),
    ]);

    await expect(
      validateServerMaskDrift({
        baseBuffer: base,
        editedBuffer: edited,
        maskBuffer: mask,
        maskType: 'exclude',
      }),
    ).resolves.toMatchObject({ drifted: true, changedPixels: 2, outsideMaskPixels: 1 });

    const clamped = await clampEditToMask({
      baseBuffer: base,
      editedBuffer: edited,
      maskBuffer: mask,
      maskType: 'exclude',
    });

    await expect(
      validateServerMaskDrift({
        baseBuffer: base,
        editedBuffer: clamped,
        maskBuffer: mask,
        maskType: 'exclude',
      }),
    ).resolves.toMatchObject({ drifted: false, changedPixels: 1, outsideMaskPixels: 0 });
    await expect(rawPixelsFromPng(clamped)).resolves.toEqual([
      ...rgbaPixel(0, 0, 0),
      ...rgbaPixel(255, 0, 0),
      ...rgbaPixel(0, 0, 0),
    ]);
  });
});
