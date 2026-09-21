import { existsSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Filesystem root for `/storage/...` static + theme extract + tenant media.
 * Default: `./storage` relative to `process.cwd()` (run Nest from `backend/` → `backend/storage`).
 */
function resolveStorageRoot(): string {
  const raw = process.env.BACKEND_STORAGE_DIR?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }
  return path.join(process.cwd(), 'storage');
}

/**
 * Root where uploaded theme **ZIP** archives are copied (`themes/{web|mobile}/{slug}/*.zip`).
 * Monorepo + cwd `backend/`: `../storage` (repo `saas-platform/storage/`) when that folder exists.
 * Otherwise same as runtime storage. Override with `THEME_ZIP_ARCHIVE_DIR`.
 */
function resolveThemeZipArchiveRoot(): string {
  const raw = process.env.THEME_ZIP_ARCHIVE_DIR?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }
  const cwdIsBackendPackage = path.basename(process.cwd()) === 'backend';
  const parentStorage = path.join(process.cwd(), '..', 'storage');
  if (cwdIsBackendPackage && existsSync(parentStorage)) {
    return parentStorage;
  }
  return resolveStorageRoot();
}

export function getBackendStorageRoot(): string {
  return resolveStorageRoot();
}

/** Canonical ZIP inbox (repo `storage/` in monorepo); may equal runtime root if not split. */
export function getThemeZipArchiveRoot(): string {
  return resolveThemeZipArchiveRoot();
}

/** Reserved for future split-tree diagnostics; layout is described in `logActiveStorageRoot`. */
export function warnIfSplitThemeTrees(): void {
  void 0;
}

/** Dev-only: log which disk trees back `/storage/` and theme ZIP copies. */
export function logActiveStorageRoot(): void {
  if (process.env.NODE_ENV === 'production') return;
  const root = resolveStorageRoot();
  // eslint-disable-next-line no-console
  console.log(`[storage] /storage/ (runtime) → ${root.replace(/\\/g, '/')}`);
  const zipRoot = resolveThemeZipArchiveRoot();
  if (zipRoot !== root) {
    // eslint-disable-next-line no-console
    console.log(
      `[storage] theme ZIP archive → ${zipRoot.replace(/\\/g, '/')}/themes/{web|mobile}/<slug>/*.zip`,
    );
  }
}
