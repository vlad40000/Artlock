const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function assertSupportedImageMime(mimeType: string) {
  if (!IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported file type. Use PNG, JPEG, or WEBP.');
  }
}

export function getFileExtension(fileName: string, mimeType: string) {
  const lowerName = fileName.toLowerCase();
  const fromName = lowerName.includes('.') ? lowerName.split('.').pop() : null;

  if (fromName && ['png', 'jpg', 'jpeg', 'webp'].includes(fromName)) {
    return fromName === 'jpg' ? 'jpeg' : fromName;
  }

  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpeg';
}
