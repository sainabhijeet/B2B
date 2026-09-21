const RESERVED = new Set([
  'www',
  'api',
  'admin',
  'app',
  'cdn',
  'static',
  'mail',
  'ftp',
  'localhost',
  'dashboard',
  'panel',
  'auth',
  'docs',
  'storage',
]);

/**
 * Convert brand / store display name to a single DNS label (subdomain).
 */
export function slugifyBrandNameToSubdomain(brand: string): string {
  const raw = brand
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  let s = raw || 'store';
  if (RESERVED.has(s)) {
    s = `${s}-store`;
  }
  if (s.length < 2) {
    s = 'store';
  }
  return s;
}

export function isReservedSubdomain(s: string): boolean {
  return RESERVED.has(s.toLowerCase());
}

const SUBDOMAIN_LABEL_MAX = 63;

/**
 * Normalize user-entered subdomain to a single DNS label (lowercase, hyphens).
 */
export function normalizeSubdomainLabel(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, SUBDOMAIN_LABEL_MAX);
  return s;
}

export function isValidSubdomainLabel(s: string): boolean {
  if (s.length < 2 || s.length > SUBDOMAIN_LABEL_MAX) return false;
  if (isReservedSubdomain(s)) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(s);
}

/**
 * Strip protocol/path/port from a URL or host string; returns lowercase hostname or ''.
 */
export function normalizeCustomDomainHost(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^https?:\/\//u, '');
  s = s.split('/')[0] ?? '';
  s = s.split(':')[0] ?? '';
  s = s.replace(/^\.+|\.+$/g, '');
  return s;
}

export function isPlausibleCustomDomainHost(host: string): boolean {
  if (!host || host.length > 253) return false;
  if (host.includes('..') || host.startsWith('.') || host.endsWith('.')) return false;
  const labels = host.split('.');
  if (labels.length < 2) return false;
  for (const lb of labels) {
    if (lb.length < 1 || lb.length > 63) return false;
    if (!/^[a-z0-9-]+$/u.test(lb)) return false;
    if (lb.startsWith('-') || lb.endsWith('-')) return false;
  }
  return true;
}
