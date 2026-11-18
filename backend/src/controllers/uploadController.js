import { config, imageKitConfigured } from '../config/env.js';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  deleteImageKitFile,
  imagekit,
  validateImageMeta,
} from '../config/imagekit.js';
import { asyncHandler, fail, ok } from '../utils/http.js';

export const uploadAuth = asyncHandler(async (_req, res) => {
  if (!imagekit) return fail(res, 503, 'ImageKit is not configured on the server');
  return ok(res, {
    ...imagekit.getAuthenticationParameters(),
    publicKey: config.imagekit.publicKey,
    urlEndpoint: config.imagekit.urlEndpoint,
    maxSize: MAX_IMAGE_BYTES,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  });
});

export const validateUpload = asyncHandler(async (req, res) => {
  const error = validateImageMeta(req.body);
  if (error) return fail(res, 400, error);
  return ok(res, { valid: true }, 'File is valid');
});

export const verifyUpload = asyncHandler(async (req, res) => {
  if (!imagekit) return fail(res, 503, 'ImageKit is not configured on the server');
  const { fileId } = req.body;
  if (!fileId) return fail(res, 400, 'fileId is required');

  let details;
  try {
    details = await imagekit.getFileDetails(fileId);
  } catch {
    return fail(res, 400, 'Uploaded file could not be verified');
  }
  const extension = String(details.extension || '').toLowerCase();
  const mime = ['jpg', 'jpeg'].includes(extension) ? 'image/jpeg' : `image/${extension}`;
  const error = validateImageMeta({ name: details.name, type: mime, size: details.size });
  if (error) {
    await deleteImageKitFile(fileId);
    return fail(res, 400, `Upload rejected: ${error}`);
  }
  return ok(res, { url: details.url, fileId: details.fileId, name: details.name, size: details.size });
});

export const deleteUpload = asyncHandler(async (req, res) => {
  if (!imagekit) return fail(res, 503, 'ImageKit is not configured on the server');
  const { fileId } = req.params;
  if (!fileId) return fail(res, 400, 'fileId is required');
  await imagekit.deleteFile(fileId);
  return ok(res, { fileId }, 'Image deleted');
});

export const uploadStatus = asyncHandler(async (_req, res) => ok(res, { configured: imageKitConfigured }));
