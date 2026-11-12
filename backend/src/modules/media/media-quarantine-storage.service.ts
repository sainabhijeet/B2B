import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, realpath, rm, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { getBackendStorageRoot } from '../../common/utils/storage-root';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class MediaQuarantineStorageService {
  constructor(private readonly config: ConfigService) {}

  async write(
    objectId: string,
    body: Readable | Buffer,
    maxBytes: number,
  ): Promise<{ sizeBytes: number }> {
    const target = await this.preparePath(objectId);
    let bytes = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        bytes += chunk.length;
        callback(
          bytes > maxBytes ? new Error('QUARANTINE_SIZE_LIMIT') : null,
          chunk,
        );
      },
    });
    try {
      await pipeline(
        Buffer.isBuffer(body) ? Readable.from(body) : body,
        limiter,
        createWriteStream(target, { flags: 'wx', mode: 0o600 }),
      );
      return { sizeBytes: bytes };
    } catch {
      await rm(path.dirname(target), { recursive: true, force: true }).catch(
        () => undefined,
      );
      throw new Error('Media quarantine write failed.');
    }
  }

  async exists(objectId: string): Promise<boolean> {
    try {
      await access(await this.resolveTrustedObjectPath(objectId));
      return true;
    } catch {
      return false;
    }
  }

  async head(objectId: string): Promise<{ sizeBytes: number } | null> {
    try {
      const value = await stat(await this.resolveTrustedObjectPath(objectId));
      return value.isFile() ? { sizeBytes: value.size } : null;
    } catch {
      return null;
    }
  }

  async createReadStream(objectId: string): Promise<Readable> {
    const target = await this.resolveTrustedObjectPath(objectId);
    const value = await stat(target);
    if (!value.isFile()) throw new Error('Quarantined media is unavailable.');
    return createReadStream(target);
  }

  async delete(objectId: string): Promise<void> {
    await rm(path.dirname(await this.resolveTrustedObjectPath(objectId)), {
      recursive: true,
      force: true,
    });
  }

  async resolveTrustedObjectPath(objectId: string): Promise<string> {
    this.assertId(objectId);
    const root = await this.safeRoot();
    const directory = path.resolve(root, objectId);
    this.assertInside(root, directory);
    const directoryReal = await realpath(directory).catch(() => directory);
    this.assertInside(root, directoryReal);
    const target = path.resolve(directoryReal, 'payload');
    this.assertInside(root, target);
    return target;
  }

  private async preparePath(objectId: string): Promise<string> {
    this.assertId(objectId);
    const root = await this.safeRoot();
    const directory = path.resolve(root, objectId);
    this.assertInside(root, directory);
    await mkdir(directory, { recursive: false, mode: 0o700 });
    const directoryReal = await realpath(directory);
    this.assertInside(root, directoryReal);
    return path.join(directoryReal, 'payload');
  }

  private async safeRoot(): Promise<string> {
    const configured = this.config
      .get<string>('mediaMalware.quarantineDir', '')
      ?.trim();
    const root = path.resolve(
      configured || path.join(process.cwd(), '..', 'private-media-quarantine'),
    );
    const publicRoot = path.resolve(getBackendStorageRoot());
    const relative = path.relative(publicRoot, root);
    if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative)))
      throw new Error('Media quarantine configuration is invalid.');
    await mkdir(root, { recursive: true, mode: 0o700 });
    return realpath(root);
  }

  private assertInside(root: string, value: string): void {
    const relative = path.relative(root, value);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error('Media quarantine path is invalid.');
  }
  private assertId(value: string): void {
    if (!UUID.test(value))
      throw new Error('Media quarantine object id is invalid.');
  }
}
