import { put, del, list } from '@vercel/blob';

/**
 * Uploads a file to Vercel Blob storage.
 * @param path The path/filename in the blob storage.
 * @param file The file content (Buffer, Blob, or string).
 * @param options Additional upload options.
 * @returns The URL of the uploaded blob.
 */
export async function uploadBlob(path: string, file: Buffer | Blob | string, options: { contentType?: string } = {}) {
  try {
    const { url } = await put(path, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: options.contentType,
    });
    return url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw error;
  }
}

/**
 * Specialized helper for generated base64 assets.
 */
export async function uploadGeneratedAsset(args: {
  path: string;
  base64: string;
  mimeType: string;
}) {
  const buffer = Buffer.from(args.base64, 'base64');
  return uploadBlob(args.path, buffer, { contentType: args.mimeType });
}

/**
 * Downloads a blob and returns its base64 representation.
 */
export async function downloadAssetAsBase64(blobUrl: string) {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error('Unable to download source asset');
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = response.headers.get('content-type') || 'image/png';

  return {
    base64: buffer.toString('base64'),
    mimeType,
  };
}

/**
 * Deletes a blob from Vercel Blob storage.
 * @param url The URL of the blob to delete.
 */
export async function deleteBlob(url: string) {
  try {
    await del(url);
  } catch (error) {
    console.error('Error deleting from Vercel Blob:', error);
    throw error;
  }
}

/**
 * Lists blobs in a specific folder.
 * @param prefix The folder prefix.
 */
export async function listBlobs(prefix?: string) {
  try {
    const { blobs } = await list({ prefix });
    return blobs;
  } catch (error) {
    console.error('Error listing Vercel Blobs:', error);
    throw error;
  }
}
