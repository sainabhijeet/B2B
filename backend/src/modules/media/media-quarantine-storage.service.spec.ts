import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { MediaQuarantineStorageService } from './media-quarantine-storage.service';

const id = '11111111-1111-4111-8111-111111111111';

describe('MediaQuarantineStorageService', () => {
  let root: string;
  let service: MediaQuarantineStorageService;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'media-quarantine-'));
    service = new MediaQuarantineStorageService({
      get: jest.fn(() => root),
    } as any);
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('stores an opaque payload in the private quarantine root', async () => {
    await expect(
      service.write(id, Readable.from(Buffer.from('safe')), 4),
    ).resolves.toEqual({ sizeBytes: 4 });
    expect(await readFile(path.join(root, id, 'payload'), 'utf8')).toBe('safe');
  });

  it('rejects oversized streams and removes partial content', async () => {
    await expect(
      service.write(id, Readable.from([Buffer.alloc(3), Buffer.alloc(3)]), 5),
    ).rejects.toThrow('Media quarantine write failed.');
    await expect(service.exists(id)).resolves.toBe(false);
  });

  it.each([
    '../escape',
    'not-a-uuid',
    '11111111-1111-4111-8111-111111111111\\escape',
  ])(
    'rejects unsafe identifiers without leaking the configured root',
    async (unsafe) => {
      let message = '';
      try {
        await service.write(unsafe, Buffer.from('x'), 10);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toBeTruthy();
      expect(message).not.toContain(root);
    },
  );
  it('deletes missing quarantine content idempotently', async () => {
    await expect(service.delete(id)).resolves.toBeUndefined();
    await expect(service.delete(id)).resolves.toBeUndefined();
  });
});
