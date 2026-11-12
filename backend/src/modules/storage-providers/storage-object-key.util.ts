import { BadRequestException } from '@nestjs/common';

const ENCODED_PATH_META_PATTERN = /%(?:00|2e|2f|3a|5c)/i;

export function normalizeStorageObjectKey(key: string): string {
  const value = key.trim();
  if (!value || value.length > 1024) {
    throw new BadRequestException('Storage object key is invalid.');
  }
  if (
    value.includes('\0') ||
    value.includes('\\') ||
    value.includes(':') ||
    ENCODED_PATH_META_PATTERN.test(value) ||
    value.startsWith('/') ||
    /^[a-zA-Z]:[\\/]/.test(value)
  ) {
    throw new BadRequestException('Storage object key is invalid.');
  }
  const parts = value.split('/');
  if (
    parts.some(
      (part) => part === '' || part === '.' || part === '..' || !part.trim(),
    )
  ) {
    throw new BadRequestException('Storage object key is invalid.');
  }
  return value;
}
