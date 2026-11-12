import { createReadStream, createWriteStream } from 'node:fs';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
  realpath,
} from 'node:fs/promises';
import * as path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  PlatformStorageAdapter,
  StorageObjectHead,
  StorageObjectPutInput,
  StorageRuntimeHealth,
} from './storage-runtime.types';

export const DEFAULT_LOCAL_STORAGE_MAX_WRITE_BYTES = 25 * 1024 * 1024;

const LOCAL_STORAGE_LIMIT_ERROR =
  'Local storage write size exceeds configured limit.';

class MaxBytesTransform extends Transform {
  private bytesSeen = 0;

  constructor(private readonly maxBytes: number) {
    super();
  }

  override _transform(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk, encoding);
    this.bytesSeen += buffer.length;
    if (this.bytesSeen > this.maxBytes) {
      callback(new Error(LOCAL_STORAGE_LIMIT_ERROR));
      return;
    }
    callback(null, buffer);
  }
}

export class LocalStorageRuntimeAdapter implements PlatformStorageAdapter {
  readonly type = 'LOCAL' as const;

  constructor(
    private readonly storageRoot: string,
    readonly publicBaseUrl: string | null,
    private readonly maxWriteBytes = DEFAULT_LOCAL_STORAGE_MAX_WRITE_BYTES,
  ) {}

  async put(input: StorageObjectPutInput): Promise<StorageObjectHead> {
    return this.write(input, 'w');
  }

  async putIfAbsent(input: StorageObjectPutInput): Promise<StorageObjectHead> {
    return this.write(input, 'wx');
  }

  private async write(
    input: StorageObjectPutInput,
    flags: 'w' | 'wx',
  ): Promise<StorageObjectHead> {
    const safePath = await this.resolveWritablePath(input.key);
    await mkdir(path.dirname(safePath), { recursive: true });
    await this.assertParentInsideRoot(path.dirname(safePath));
    try {
      if (typeof input.body === 'string' || Buffer.isBuffer(input.body)) {
        this.assertWithinMaxWriteBytes(Buffer.byteLength(input.body));
        await writeFile(safePath, input.body, { flag: flags });
      } else {
        await pipeline(
          input.body,
          new MaxBytesTransform(this.maxWriteBytes),
          createWriteStream(safePath, { flags }),
        );
      }
    } catch (error) {
      await rm(safePath, { force: true }).catch(() => undefined);
      throw this.sanitizeWriteError(error);
    }
    return this.head(input.key).then((head) => {
      if (!head) throw new Error('Local storage write verification failed.');
      return head;
    });
  }

  async getStream(key: string): Promise<Readable> {
    const safePath = await this.resolveExistingRealPath(key);
    await access(safePath);
    return createReadStream(safePath);
  }

  async head(key: string): Promise<StorageObjectHead | null> {
    try {
      const safePath = await this.resolveExistingRealPath(key);
      const info = await stat(safePath);
      if (!info.isFile()) return null;
      return {
        key: this.normalizeObjectKey(key),
        contentLength: info.size,
        contentType: null,
        etag: null,
        lastModified: info.mtime,
      };
    } catch (error) {
      if ((error as { code?: string })?.code === 'ENOENT') return null;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }

  async delete(key: string): Promise<void> {
    const safePath = await this.resolveExistingRealPath(key);
    await rm(safePath, { force: true });
  }

  async healthCheck(): Promise<StorageRuntimeHealth> {
    const startedAt = Date.now();
    try {
      await this.probeStorageRoot();
      return {
        status: 'HEALTHY',
        ok: true,
        latencyMs: Math.max(Date.now() - startedAt, 0),
        message: 'Local storage root is accessible.',
      };
    } catch {
      return {
        status: 'UNHEALTHY',
        ok: false,
        latencyMs: Math.max(Date.now() - startedAt, 0),
        message: 'Local storage root is not accessible.',
      };
    }
  }

  private async probeStorageRoot(): Promise<void> {
    const root = path.resolve(this.storageRoot);
    await access(root);
    const probeDir = await mkdtemp(path.join(root, '.storage-health-'));
    try {
      const probePath = path.join(probeDir, 'probe.txt');
      await writeFile(probePath, 'storage-provider-health', 'utf8');
      const content = await readFile(probePath, 'utf8');
      if (content !== 'storage-provider-health') {
        throw new Error('Local storage probe readback mismatch.');
      }
    } finally {
      await rm(probeDir, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }

  private resolveExistingPath(key: string): string {
    const normalized = this.normalizeObjectKey(key);
    const root = path.resolve(this.storageRoot);
    const resolved = path.resolve(root, normalized);
    this.assertInsideRoot(root, resolved);
    return resolved;
  }

  private async resolveExistingRealPath(key: string): Promise<string> {
    const resolved = this.resolveExistingPath(key);
    const root = path.resolve(this.storageRoot);
    const rootReal = await realpath(root).catch(() => root);
    const resolvedReal = await realpath(resolved);
    this.assertInsideRoot(rootReal, resolvedReal);
    return resolvedReal;
  }

  private async resolveWritablePath(key: string): Promise<string> {
    return this.resolveExistingPath(key);
  }

  private assertWithinMaxWriteBytes(size: number): void {
    if (size > this.maxWriteBytes) {
      throw new Error(LOCAL_STORAGE_LIMIT_ERROR);
    }
  }

  private sanitizeWriteError(error: unknown): Error {
    const message = String((error as { message?: string })?.message ?? '');
    if (message === LOCAL_STORAGE_LIMIT_ERROR) {
      return new Error(LOCAL_STORAGE_LIMIT_ERROR);
    }
    if (
      message === 'Storage object key is required.' ||
      message === 'Storage object key is invalid.' ||
      message === 'Storage object key escapes the storage root.'
    ) {
      return error instanceof Error ? error : new Error(message);
    }
    return new Error('Local storage write failed.');
  }

  private normalizeObjectKey(key: string): string {
    const value = key.trim();
    if (!value) throw new Error('Storage object key is required.');
    if (
      value.includes('\0') ||
      value.includes('\\') ||
      path.isAbsolute(value) ||
      path.win32.isAbsolute(value) ||
      value.includes(':')
    ) {
      throw new Error('Storage object key is invalid.');
    }
    const parts = value.split('/');
    if (
      parts.some(
        (part) => part === '' || part === '.' || part === '..' || !part.trim(),
      )
    ) {
      throw new Error('Storage object key is invalid.');
    }
    const normalized = path.posix.normalize(value);
    if (normalized === '.' || normalized.startsWith('../')) {
      throw new Error('Storage object key is invalid.');
    }
    return normalized;
  }

  private async assertParentInsideRoot(parentPath: string): Promise<void> {
    const root = path.resolve(this.storageRoot);
    const rootReal = await realpath(root).catch(() => root);
    const parentReal = await realpath(parentPath).catch(() => parentPath);
    this.assertInsideRoot(rootReal, parentReal, { allowEqual: true });
  }

  private assertInsideRoot(
    root: string,
    resolved: string,
    options: { allowEqual?: boolean } = {},
  ): void {
    const relative = path.relative(root, resolved);
    if (
      (!options.allowEqual && relative === '') ||
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {
      throw new Error('Storage object key escapes the storage root.');
    }
  }
}
