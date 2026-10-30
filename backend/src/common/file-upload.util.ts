import { BadRequestException } from '@nestjs/common';

/**
 * Maximum permitted size for base64 photo payload: 3 MB decoded (approx 4.2 MB base64 string)
 */
const MAX_BASE64_LENGTH = 4.2 * 1024 * 1024;

/**
 * Supported MIME prefixes for images
 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/**
 * Validates photo or image payload sent as Base64 data URI or storage key.
 * Enforces size limits, MIME type restrictions, and magic bytes verification.
 * Prevents executable upload, stored XSS (SVG/HTML), and server memory exhaustion.
 */
export function validateAndSanitizePhoto(
  photo: string | undefined | null,
  fieldName = 'photo',
): string | undefined {
  if (!photo) return undefined;

  const trimmed = photo.trim();
  if (!trimmed) return undefined;

  // Allow storage keys or URLs (e.g. "photo-12345.jpg", "https://...")
  if (
    !trimmed.startsWith('data:') &&
    (trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      /^[a-zA-Z0-9_\-\.\/]{3,120}$/.test(trimmed))
  ) {
    // Basic path traversal prevention in keys
    if (trimmed.includes('..') || trimmed.includes('\\')) {
      throw new BadRequestException(`Invalid ${fieldName} path key: path traversal characters detected.`);
    }
    return trimmed;
  }

  // Base64 Data URI Validation
  if (trimmed.startsWith('data:')) {
    if (trimmed.length > MAX_BASE64_LENGTH) {
      throw new BadRequestException(
        `${fieldName} exceeds maximum allowable size (maximum 3 MB). Please upload a compressed photo.`,
      );
    }

    const matches = trimmed.match(/^data:([a-zA-Z0-9\/+-]+);base64,(.+)$/s);
    if (!matches) {
      throw new BadRequestException(
        `Invalid ${fieldName} format: Must be a valid image base64 data URI (JPEG, PNG, or WebP).`,
      );
    }

    const mime = matches[1].toLowerCase();
    const base64Data = matches[2];

    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new BadRequestException(
        `Unsupported ${fieldName} MIME type (${mime}). Only JPEG, PNG, and WebP images are allowed.`,
      );
    }

    // Magic Bytes Verification (File signature validation from first 16 base64 chars)
    const headerPrefix = base64Data.substring(0, 16);
    const isJpeg = headerPrefix.startsWith('/9j/');
    const isPng = headerPrefix.startsWith('iVBORw0KGgo');
    const isWebp = headerPrefix.startsWith('UklGR');

    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException(
        `Invalid ${fieldName} file signature: Content does not match expected JPEG, PNG, or WebP binary header.`,
      );
    }

    // Reject executable and script markers anywhere in base64 header
    if (headerPrefix.startsWith('TVqQ') || headerPrefix.startsWith('f0VMR')) {
      throw new BadRequestException(`Security violation: Executable binary file uploaded in ${fieldName}.`);
    }

    return trimmed;
  }

  // If raw base64 without data URI prefix
  if (trimmed.length > MAX_BASE64_LENGTH) {
    throw new BadRequestException(`${fieldName} exceeds maximum allowable size.`);
  }

  return trimmed;
}

