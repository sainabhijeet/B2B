import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { LocalStorageRuntimeAdapter } from './local-storage-runtime.adapter';

describe('LocalStorageRuntimeAdapter', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'saas-local-storage-runtime-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes, reads, heads, and deletes objects within the configured storage root', async () => {
    const adapter = new LocalStorageRuntimeAdapter(root, null);

    const head = await adapter.put({
      key: 'tenant-a/images/logo.txt',
      body: 'logo',
      contentType: 'text/plain',
    });

    expect(head.key).toBe('tenant-a/images/logo.txt');
    expect(head.contentLength).toBe(4);
    await expect(
      readFile(path.join(root, 'tenant-a', 'images', 'logo.txt'), 'utf8'),
    ).resolves.toBe('logo');
    expect(await adapter.exists('tenant-a/images/logo.txt')).toBe(true);

    await adapter.delete('tenant-a/images/logo.txt');

    expect(await adapter.exists('tenant-a/images/logo.txt')).toBe(false);
  });

  it('streams bounded input directly to disk', async () => {
    const adapter = new LocalStorageRuntimeAdapter(root, null, 16);

    const head = await adapter.put({
      key: 'tenant-a/stream.txt',
      body: Readable.from(['stream', '-', 'body']),
    });

    expect(head.contentLength).toBe(11);
    await expect(
      readFile(path.join(root, 'tenant-a', 'stream.txt'), 'utf8'),
    ).resolves.toBe('stream-body');
  });

  it('allows writes exactly at the configured byte boundary', async () => {
    const adapter = new LocalStorageRuntimeAdapter(root, null, 5);

    const head = await adapter.put({
      key: 'tenant-a/boundary.txt',
      body: Readable.from(['12', '345']),
    });

    expect(head.contentLength).toBe(5);
    await expect(
      readFile(path.join(root, 'tenant-a', 'boundary.txt'), 'utf8'),
    ).resolves.toBe('12345');
  });

  it('rejects stream writes larger than the configured byte boundary and cleans up partial files', async () => {
    const adapter = new LocalStorageRuntimeAdapter(root, null, 5);
    const objectPath = path.join(root, 'tenant-a', 'oversize.txt');

    await expect(
      adapter.put({
        key: 'tenant-a/oversize.txt',
        body: Readable.from(['123', '456']),
      }),
    ).rejects.toThrow('Local storage write size exceeds configured limit.');
    await expect(access(objectPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects buffer writes larger than the configured byte boundary and cleans up partial files', async () => {
    const adapter = new LocalStorageRuntimeAdapter(root, null, 5);
    const objectPath = path.join(root, 'tenant-a', 'oversize-buffer.txt');

    await expect(
      adapter.put({
        key: 'tenant-a/oversize-buffer.txt',
        body: Buffer.from('123456'),
      }),
    ).rejects.toThrow('Local storage write size exceeds configured limit.');
    await expect(access(objectPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not consume a complete oversize stream before rejecting it', async () => {
    const adapter = new LocalStorageRuntimeAdapter(root, null, 1024);
    let chunksRead = 0;
    async function* source() {
      for (let index = 0; index < 100; index += 1) {
        chunksRead += 1;
        yield Buffer.alloc(1024);
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    await expect(
      adapter.put({
        key: 'tenant-a/large-stream.bin',
        body: Readable.from(source()),
      }),
    ).rejects.toThrow('Local storage write size exceeds configured limit.');

    expect(chunksRead).toBeLessThan(100);
    await expect(
      access(path.join(root, 'tenant-a', 'large-stream.bin')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each([
    '../outside.txt',
    'tenant/../../outside.txt',
    '/absolute.txt',
    'C:/absolute.txt',
    'tenant\\windows-path.txt',
    'tenant//blank.txt',
    'tenant/%00.txt\0',
  ])('rejects unsafe object key %s', async (key) => {
    const adapter = new LocalStorageRuntimeAdapter(root, null);

    await expect(adapter.put({ key, body: 'unsafe' })).rejects.toThrow(
      /invalid|escapes/,
    );
  });

  it('uses the actual configured root for a sanitized local health probe', async () => {
    const adapter = new LocalStorageRuntimeAdapter(root, null);

    const health = await adapter.healthCheck();

    expect(health.ok).toBe(true);
    expect(health.status).toBe('HEALTHY');
    expect(JSON.stringify(health)).not.toContain(root);
    await expect(readdir(root)).resolves.not.toContain(
      expect.stringMatching(/^\.storage-health-/),
    );
  });

  it('reports an invalid actual root as unhealthy without leaking the filesystem path', async () => {
    const filePath = path.join(root, 'not-a-directory');
    await writeFile(filePath, 'not a storage root', 'utf8');
    const adapter = new LocalStorageRuntimeAdapter(filePath, null);

    const health = await adapter.healthCheck();

    expect(health.ok).toBe(false);
    expect(health.status).toBe('UNHEALTHY');
    expect(JSON.stringify(health)).not.toContain(filePath);
    expect(JSON.stringify(health)).not.toContain(root);
  });

  it('rejects symlink leaf escapes during read, head, and delete operations', async () => {
    const outsideRoot = await mkdtemp(
      path.join(tmpdir(), 'saas-local-storage-outside-'),
    );
    const outsideFile = path.join(outsideRoot, 'secret.txt');
    await writeFile(outsideFile, 'secret');

    const adapter = new LocalStorageRuntimeAdapter(root, null);
    const linkPath = path.join(root, 'tenant-link.txt');

    try {
      await symlink(outsideFile, linkPath);
    } catch (error) {
      await rm(outsideRoot, { recursive: true, force: true });
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES') {
        return;
      }
      throw error;
    }

    try {
      await expect(adapter.head('tenant-link.txt')).rejects.toThrow(/escapes/);
      await expect(adapter.getStream('tenant-link.txt')).rejects.toThrow(
        /escapes/,
      );
      await expect(adapter.delete('tenant-link.txt')).rejects.toThrow(
        /escapes/,
      );
      await expect(readFile(outsideFile, 'utf8')).resolves.toBe('secret');
    } finally {
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });
});
