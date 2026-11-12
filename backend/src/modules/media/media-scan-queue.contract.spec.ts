import {
  mediaScanJobId,
  validateMediaScanPayload,
} from './media-scan-queue.contract';

describe('media scan queue contract', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  it('uses deterministic jobs with identifier-only payloads', () => {
    expect(mediaScanJobId(id)).toBe(
      'media-scan-11111111-1111-4111-8111-111111111111',
    );
    expect(validateMediaScanPayload({ storageObjectId: id })).toEqual({
      storageObjectId: id,
    });
  });
  it.each([
    {},
    { storageObjectId: '../x' },
    { storageObjectId: id, path: 'secret' },
  ])('rejects malformed or expanded payloads', (value) => {
    expect(() => validateMediaScanPayload(value)).toThrow();
  });
});
