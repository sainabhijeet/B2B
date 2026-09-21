import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getThemeZipArchiveRoot } from '../../common/utils/storage-root';

export type LegacyThemeArchive = {
  absolutePath: string;
  objectSourceKey: string;
  sizeBytes: number;
};

export async function findLegacyThemeArchive(
  storagePath: string | null | undefined,
): Promise<LegacyThemeArchive | null> {
  const normalized = storagePath?.trim().replace(/\\/g, '/');
  if (
    !normalized ||
    !normalized.startsWith('themes/') ||
    normalized.includes('..')
  ) {
    return null;
  }
  const root = getThemeZipArchiveRoot();
  const directory = path.join(root, ...normalized.split('/'));
  let names: string[];
  try {
    names = (await fs.readdir(directory))
      .filter((name) => name.toLowerCase().endsWith('.zip'))
      .sort();
  } catch {
    return null;
  }
  const name = names[0];
  if (!name) return null;
  const absolutePath = path.join(directory, name);
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) return null;
    return {
      absolutePath,
      objectSourceKey: path.relative(root, absolutePath).replace(/\\/g, '/'),
      sizeBytes: stat.size,
    };
  } catch {
    return null;
  }
}

export function sha256File(absolutePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(absolutePath);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function sha256Stream(
  stream: AsyncIterable<Uint8Array>,
): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}
