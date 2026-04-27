import { upload } from '@vercel/blob/client';

/**
 * Shared client-side helper to upload an asset directly to Vercel Blob
 * and then register it in the application database.
 * This bypasses the 4.5MB server body limit.
 */
export async function clientUploadAsset(
  file: File | Blob, 
  projectId: string, 
  kind: 'reference' | 'mask',
  fileName: string = 'upload.png'
) {
  // 1. Get dimensions for images
  let dimensions: { width: number; height: number } | null = null;
  if (file.type.startsWith('image/')) {
    dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // 2. Upload directly to Vercel Blob using the client-side pattern
  const blob = await upload(fileName, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
  });

  // 3. Register the uploaded blob in our database
  const resp = await fetch('/api/assets/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      kind,
      blobUrl: blob.url,
      fileName: fileName,
      mimeType: file.type,
      size: file.size,
      dimensions,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Upload registration failed');
  }

  return data;
}
