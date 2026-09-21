import AdmZip from 'adm-zip';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { issue, ValidationIssue } from './validation-report.types';

export type ZipLimits = {
  maxArchiveBytes: number;
  maxUncompressedBytes: number;
  maxCompressionRatio: number;
};

export type ZipInspection = {
  entries: Array<{
    name: string;
    compressedSize: number;
    uncompressedSize: number;
    directory: boolean;
  }>;
  archiveSize: number;
  totalUncompressedBytes: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export async function inspectZipStructure(
  archivePath: string,
  limits: ZipLimits,
): Promise<ZipInspection> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let archiveSize = 0;
  try {
    archiveSize = (await fs.stat(archivePath)).size;
  } catch {
    errors.push(
      issue('ARCHIVE_NOT_FOUND', 'ERROR', 'Quarantine archive does not exist.'),
    );
    return {
      entries: [],
      archiveSize,
      totalUncompressedBytes: 0,
      errors,
      warnings,
    };
  }
  if (archiveSize > limits.maxArchiveBytes) {
    errors.push(
      issue(
        'ARCHIVE_TOO_LARGE',
        'ERROR',
        `Archive exceeds ${limits.maxArchiveBytes} bytes.`,
      ),
    );
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(archivePath);
  } catch {
    errors.push(
      issue('INVALID_ZIP', 'ERROR', 'Archive is not a readable ZIP file.'),
    );
    return {
      entries: [],
      archiveSize,
      totalUncompressedBytes: 0,
      errors,
      warnings,
    };
  }

  const entries: ZipInspection['entries'] = [];
  const names = new Set<string>();
  let totalUncompressedBytes = 0;
  for (const entry of zip.getEntries()) {
    const rawName = String(entry.entryName ?? '');
    const name = rawName.replace(/\\/g, '/');
    const normalized = path.posix.normalize(name);
    const header = entry.header as unknown as {
      compressedSize?: number;
      size?: number;
    };
    const compressedSize = Math.max(0, Number(header.compressedSize ?? 0));
    const uncompressedSize = Math.max(0, Number(header.size ?? 0));
    const directory = Boolean(entry.isDirectory);
    if (
      !name ||
      name.includes('\0') ||
      name.startsWith('/') ||
      /^[A-Za-z]:\//.test(name) ||
      normalized === '..' ||
      normalized.startsWith('../')
    ) {
      errors.push(
        issue(
          'INVALID_PATH',
          'ERROR',
          'ZIP entry contains an unsafe path.',
          name || null,
        ),
      );
    }
    if (name !== normalized && !directory) {
      warnings.push(
        issue(
          'NON_CANONICAL_PATH',
          'WARNING',
          'ZIP entry path is not canonical.',
          name,
        ),
      );
    }
    if (names.has(normalized)) {
      errors.push(
        issue(
          'DUPLICATE_PATH',
          'ERROR',
          'ZIP contains duplicate normalized paths.',
          name,
        ),
      );
    }
    names.add(normalized);
    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > limits.maxUncompressedBytes) {
      errors.push(
        issue(
          'ZIP_BOMB',
          'ERROR',
          'ZIP expands beyond the configured uncompressed-size limit.',
          name,
        ),
      );
      break;
    }
    if (compressedSize === 0 && uncompressedSize > 0) {
      errors.push(
        issue(
          'ZIP_BOMB',
          'ERROR',
          'ZIP entry has uncompressed data with zero compressed size.',
          name,
        ),
      );
    } else if (
      compressedSize > 0 &&
      uncompressedSize / compressedSize > limits.maxCompressionRatio
    ) {
      errors.push(
        issue(
          'ZIP_BOMB',
          'ERROR',
          'ZIP entry compression ratio exceeds the configured limit.',
          name,
        ),
      );
    }
    entries.push({
      name: normalized,
      compressedSize,
      uncompressedSize,
      directory,
    });
  }
  if (entries.length === 0)
    errors.push(
      issue('EMPTY_ARCHIVE', 'ERROR', 'ZIP contains no readable entries.'),
    );
  return { entries, archiveSize, totalUncompressedBytes, errors, warnings };
}

export function isSafeRelativePath(value: string): boolean {
  const normalized = value.replace(/\\/g, '/');
  return Boolean(
    normalized &&
    !normalized.includes('\0') &&
    !normalized.startsWith('/') &&
    !/^[A-Za-z]:\//.test(normalized) &&
    !normalized.split('/').some((segment) => segment === '..'),
  );
}
