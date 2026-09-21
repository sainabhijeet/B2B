import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import * as path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import AdmZip from 'adm-zip';

export type QuarantineArchive = {
  key: string;
  absolutePath: string;
  extractionPath: string;
  sha256: string;
  sizeBytes: number;
};

export function quarantineRoot(config: ConfigService): string {
  const configured = config
    .get<string>('themeReleasePipeline.quarantineDir', '')
    .trim();
  return configured || path.join(process.cwd(), 'storage', 'theme-quarantine');
}

function keyFor(idempotencyKey: string): string {
  return createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 32);
}

@Injectable()
export class ThemeQuarantineStorageService {
  constructor(private readonly configService: ConfigService) {}

  async write(
    idempotencyKey: string,
    source: Readable | Buffer,
    maxBytes: number,
  ): Promise<QuarantineArchive> {
    const key = `candidates/${keyFor(idempotencyKey)}/package.zip`;
    const root = quarantineRoot(this.configService);
    const directory = path.join(root, 'candidates', keyFor(idempotencyKey));
    const absolutePath = path.join(directory, 'package.zip');
    const extractionPath = path.join(directory, 'package');
    await fs.mkdir(directory, { recursive: true });
    const existing = await this.readExisting(key, absolutePath, extractionPath);
    if (existing) return existing;

    const hash = createHash('sha256');
    let sizeBytes = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        sizeBytes += chunk.length;
        if (sizeBytes > maxBytes) {
          callback(new Error(`Quarantine archive exceeds ${maxBytes} bytes.`));
          return;
        }
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    const input = Buffer.isBuffer(source) ? Readable.from(source) : source;
    try {
      await pipeline(
        input,
        limiter,
        createWriteStream(absolutePath, { flags: 'wx' }),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        const concurrent = await this.readExisting(
          key,
          absolutePath,
          extractionPath,
        );
        if (concurrent) return concurrent;
      }
      throw error;
    }
    return {
      key,
      absolutePath,
      extractionPath,
      sha256: hash.digest('hex'),
      sizeBytes,
    };
  }

  async inspect(key: string): Promise<QuarantineArchive | null> {
    const relative = key.replace(/\\/g, '/');
    if (!relative.startsWith('candidates/') || relative.includes('..'))
      return null;
    const root = quarantineRoot(this.configService);
    const absolutePath = path.join(root, relative);
    return this.readExisting(
      relative,
      absolutePath,
      path.join(path.dirname(absolutePath), 'package'),
    );
  }

  async extract(archive: QuarantineArchive): Promise<string> {
    await fs.rm(archive.extractionPath, { recursive: true, force: true });
    await fs.mkdir(archive.extractionPath, { recursive: true });
    new AdmZip(archive.absolutePath).extractAllTo(archive.extractionPath, true);
    return archive.extractionPath;
  }

  private async readExisting(
    key: string,
    absolutePath: string,
    extractionPath: string,
  ): Promise<QuarantineArchive | null> {
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) return null;
      const hash = createHash('sha256');
      const stream = (await import('node:fs')).createReadStream(absolutePath);
      for await (const chunk of stream) hash.update(chunk as Buffer);
      return {
        key,
        absolutePath,
        extractionPath,
        sha256: hash.digest('hex'),
        sizeBytes: stat.size,
      };
    } catch {
      return null;
    }
  }
}
