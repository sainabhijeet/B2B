/**
 * Production API host (no trailing slash, no `/api/v1`).
 * Used when `VITE_API_URL` is unset in **production** builds.
 */
export const LIVE_API_ORIGIN = 'https://shopiva.cubatic.co';

/** Strip trailing slash and accidental `/api/v1` (apiUrl() adds it again). */
function normalizeApiOrigin(raw: string): string {
  let o = raw.trim().replace(/\/+$/, '');
  if (o.endsWith('/api/v1')) {
    o = o.slice(0, -'/api/v1'.length).replace(/\/+$/, '');
  }
  return o;
}

/**
 * API origin (no path, no `/api/v1`).
 * - Production: `VITE_API_URL` or `LIVE_API_ORIGIN`.
 * - Dev: if `VITE_API_URL` unset, use empty string so requests hit the Vite dev server and
 *   `server.proxy` forwards `/api` → backend (avoids CORS for localhost vs 127.0.0.1, etc.).
 */
export function getApiOrigin(): string {
  const u = import.meta.env.VITE_API_URL;
  if (typeof u === 'string' && u.trim() !== '') {
    return normalizeApiOrigin(u);
  }
  if (import.meta.env.DEV) {
    return '';
  }
  return LIVE_API_ORIGIN;
}

export function apiUrl(path: string): string {
  const origin = getApiOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  if (origin === '') {
    return `/api/v1${p}`;
  }
  return `${origin}/api/v1${p}`;
}

export function storageUrl(path: string | null | undefined): string {
  const raw = typeof path === 'string' ? path.trim() : '';
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  const p = raw.startsWith('/') ? raw : `/${raw}`;
  if (!p.startsWith('/storage/')) return raw;
  const origin = getApiOrigin();
  return origin ? `${origin}${p}` : p;
}
