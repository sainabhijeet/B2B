import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { isSafeRelativePath } from './zip-structure.validator';
import { issue, ValidationIssue } from './validation-report.types';

type AssetValidation = {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: ValidationIssue[];
};

async function walk(
  root: string,
  directory: string,
  out: string[],
): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(path.join(root, directory), {
      withFileTypes: true,
    });
  } catch {
    return;
  }
  for (const entry of entries) {
    const relative = path.posix.join(
      directory,
      entry.name.toString().replace(/\\/g, '/'),
    );
    if (entry.isDirectory()) await walk(root, relative, out);
    else if (entry.isFile()) out.push(relative);
  }
}

function referencedPaths(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/^\.\//, '').replace(/\\/g, '/');
    if (/\.(?:json|css|png|jpe?g|gif|webp|svg|woff2?|ttf|otf)$/i.test(trimmed))
      out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) referencedPaths(item, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>))
      referencedPaths(child, out);
  }
}

function imageKind(buffer: Buffer): boolean {
  return (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
    buffer.subarray(0, 6).toString('ascii') === 'GIF89a' ||
    buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
    (buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP')
  );
}

function fontKind(buffer: Buffer): boolean {
  return (
    buffer.subarray(0, 4).toString('ascii') === 'wOFF' ||
    buffer.subarray(0, 4).toString('ascii') === 'wOF2' ||
    buffer.subarray(0, 4).equals(Buffer.from([0, 1, 0, 0])) ||
    buffer.subarray(0, 4).toString('ascii') === 'OTTO'
  );
}

async function validateCss(
  root: string,
  relative: string,
  errors: ValidationIssue[],
): Promise<void> {
  const raw = await fs.readFile(path.join(root, relative), 'utf8');
  const opens = (raw.match(/{/g) ?? []).length;
  const closes = (raw.match(/}/g) ?? []).length;
  if (opens !== closes)
    errors.push(
      issue('INVALID_CSS', 'ERROR', 'CSS braces are unbalanced.', relative),
    );
  if (
    /@import\s+url\s*\(\s*["']?https?:/i.test(raw) ||
    /expression\s*\(/i.test(raw)
  ) {
    errors.push(
      issue(
        'INVALID_CSS',
        'ERROR',
        'CSS contains a remote import or unsafe expression.',
        relative,
      ),
    );
  }
  const urlMatches = [...raw.matchAll(/url\(\s*["']?([^\)"']+)["']?\s*\)/gi)];
  for (const match of urlMatches) {
    const target = match[1].trim();
    if (/^(?:data:|https?:|#)/i.test(target)) continue;
    const resolved = path.posix.normalize(
      path.posix.join(path.posix.dirname(relative), target),
    );
    if (!isSafeRelativePath(resolved)) {
      errors.push(
        issue(
          'BROKEN_REFERENCE',
          'ERROR',
          'CSS references an unsafe relative path.',
          relative,
        ),
      );
      continue;
    }
    try {
      const stat = await fs.stat(path.join(root, resolved));
      if (!stat.isFile())
        errors.push(
          issue(
            'BROKEN_REFERENCE',
            'ERROR',
            'CSS references a non-file asset.',
            resolved,
          ),
        );
    } catch {
      errors.push(
        issue(
          'BROKEN_REFERENCE',
          'ERROR',
          'CSS references a missing asset.',
          resolved,
        ),
      );
    }
  }
}

export async function validateAssets(
  root: string,
  manifest: Record<string, unknown> | null,
): Promise<AssetValidation> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const suggestions: ValidationIssue[] = [];
  const files: string[] = [];
  await walk(root, '.', files);
  const references: string[] = [];
  referencedPaths(manifest, references);
  for (const relative of new Set(references)) {
    if (!isSafeRelativePath(relative)) {
      errors.push(
        issue(
          'BROKEN_REFERENCE',
          'ERROR',
          'Manifest references an unsafe path.',
          relative,
        ),
      );
      continue;
    }
    try {
      if (!(await fs.stat(path.join(root, relative))).isFile())
        errors.push(
          issue(
            'BROKEN_REFERENCE',
            'ERROR',
            'Manifest references a non-file asset.',
            relative,
          ),
        );
    } catch {
      errors.push(
        issue(
          'BROKEN_REFERENCE',
          'ERROR',
          'Manifest references a missing asset.',
          relative,
        ),
      );
    }
  }
  for (const relative of files) {
    const lower = relative.toLowerCase();
    if (lower.endsWith('.css')) {
      await validateCss(root, relative, errors);
      continue;
    }
    if (/\.(?:png|jpe?g|gif|webp)$/i.test(lower)) {
      const buffer = await fs.readFile(path.join(root, relative));
      if (!imageKind(buffer))
        errors.push(
          issue(
            'INVALID_IMAGE',
            'ERROR',
            'Image signature is invalid.',
            relative,
          ),
        );
    } else if (/\.svg$/i.test(lower)) {
      const raw = await fs.readFile(path.join(root, relative), 'utf8');
      if (!/<svg[\s>]/i.test(raw) || /<script[\s>]|javascript:/i.test(raw)) {
        errors.push(
          issue(
            'INVALID_IMAGE',
            'ERROR',
            'SVG is invalid or contains executable content.',
            relative,
          ),
        );
      }
    } else if (/\.(?:woff2?|ttf|otf)$/i.test(lower)) {
      const buffer = await fs.readFile(path.join(root, relative));
      if (!fontKind(buffer))
        errors.push(
          issue(
            'INVALID_FONT',
            'ERROR',
            'Font signature is invalid.',
            relative,
          ),
        );
    }
  }
  if (!files.some((file) => /\.(?:css|scss)$/i.test(file))) {
    suggestions.push(
      issue(
        'NO_STYLESHEET',
        'SUGGESTION',
        'Package does not contain a CSS stylesheet.',
      ),
    );
  }
  if (files.length > 1000)
    warnings.push(
      issue(
        'LARGE_ASSET_SET',
        'WARNING',
        'Package contains more than 1,000 files.',
      ),
    );
  return { errors, warnings, suggestions };
}
