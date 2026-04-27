import { put, del } from '@vercel/blob';

export interface DownloadedAsset {
  buffer: Buffer;
  base64: string;
  mimeType: string;
}

/**
 * Downloads an asset from a URL and returns raw bytes plus convenience encodings.
 */
export async function downloadAsset(url: string): Promise<DownloadedAsset> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset from ${url}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = response.headers.get('content-type') || 'image/png';

  return {
    buffer,
    base64: buffer.toString('base64'),
    mimeType,
  };
}

/**
 * Downloads an asset from a URL and returns it as a Base64 string.
 */
export async function downloadAssetAsBase64(url: string) {
  const asset = await downloadAsset(url);
  return {
    base64: asset.base64,
    mimeType: asset.mimeType,
  };
}

/**
 * Uploads a generated asset (Base64) to Vercel Blob.
 */
export async function uploadGeneratedAsset(args: {
  path: string;
  base64: string;
  mimeType: string;
}) {
  const buffer = Buffer.from(args.base64, 'base64');
  const { url } = await put(args.path, buffer, {
    access: 'public',
    contentType: args.mimeType,
  });
  return url;
}

/**
 * Deletes an asset from Vercel Blob.
 */
export async function deleteAsset(url: string) {
  await del(url);
}
