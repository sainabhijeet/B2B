export const MEDIA_SCAN_JOB_NAME = 'media.scan';
export type MediaScanJobPayload = { storageObjectId: string };
export function mediaScanJobId(storageObjectId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(storageObjectId))
    throw new Error('Media scan object id is invalid.');
  return `media-scan-${storageObjectId}`;
}
export function validateMediaScanPayload(value: unknown): MediaScanJobPayload {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1
  )
    throw new Error('Media scan payload is invalid.');
  const id = (value as { storageObjectId?: unknown }).storageObjectId;
  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    throw new Error('Media scan payload is invalid.');
  return { storageObjectId: id };
}
