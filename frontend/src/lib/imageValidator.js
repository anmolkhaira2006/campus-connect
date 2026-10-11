export const MAX_IMAGE_SIZE_BYTES = 60 * 1024 // 60 KB (61,440 bytes)
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg']
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]

/**
 * Validates an image file for:
 * 1. Allowed file extension (.jpg, .jpeg, .png, .webp, .svg)
 * 2. Allowed MIME type
 * 3. File size strictly <= 60 KB
 *
 * @param {File} file
 * @returns {{ valid: boolean, error?: string, sizeKb: number, extension: string }}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' }
  }

  // 1. Check file extension
  const fileName = file.name || ''
  const ext = fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase()

  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file format (.${ext || 'unknown'}). Only ${ALLOWED_IMAGE_EXTENSIONS.map((e) => '.' + e).join(', ')} images are allowed.`,
      extension: ext,
      sizeKb: Number((file.size / 1024).toFixed(1)),
    }
  }

  // 2. Check MIME type (if provided by browser)
  if (file.type && !ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid image type (${file.type}). Only JPEG, PNG, WEBP, or SVG images are allowed.`,
      extension: ext,
      sizeKb: Number((file.size / 1024).toFixed(1)),
    }
  }

  // 3. Check File Size (Strictly <= 60 KB)
  const sizeInKb = (file.size / 1024).toFixed(1)
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large (${sizeInKb} KB). Maximum allowed image size is 60 KB.`,
      sizeKb: Number(sizeInKb),
      extension: ext,
    }
  }

  return {
    valid: true,
    sizeKb: Number(sizeInKb),
    extension: ext,
  }
}
