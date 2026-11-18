import ImageKit from 'imagekit';
import { config, imageKitConfigured } from './env.js';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const imagekit = imageKitConfigured
  ? new ImageKit({
      publicKey: config.imagekit.publicKey,
      privateKey: config.imagekit.privateKey,
      urlEndpoint: config.imagekit.urlEndpoint,
    })
  : null;

export function validateImageMeta({ name, type, size } = {}) {
  if (!name || typeof name !== 'string') return 'File name is required';
  if (!type || !ALLOWED_IMAGE_TYPES.includes(type)) {
    return `Unsupported file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`;
  }
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Invalid file size';
  if (bytes > MAX_IMAGE_BYTES) return 'Image must be 5 MB or smaller';
  return null;
}

export function isImageKitUrl(url) {
  if (!url) return true;
  if (!imageKitConfigured) return false;
  try {
    const endpoint = new URL(config.imagekit.urlEndpoint);
    const value = new URL(url);
    return value.hostname === endpoint.hostname && value.pathname.startsWith(endpoint.pathname);
  } catch {
    return false;
  }
}

export async function deleteImageKitFile(fileId) {
  if (!fileId || !imagekit) return;
  try {
    await imagekit.deleteFile(fileId);
  } catch (error) {
    console.warn('ImageKit delete failed:', error.message);
  }
}
