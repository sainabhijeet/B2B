import type { Request } from 'express';

function firstHeaderValue(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(',')[0]?.trim() ?? '';
}

function requestOrigin(req: Request): string {
  const host =
    firstHeaderValue(req.headers['x-forwarded-host']) ||
    firstHeaderValue(req.headers.host);
  if (!host) return '';

  const protocol =
    firstHeaderValue(req.headers['x-forwarded-proto']) || req.protocol || 'http';
  return `${protocol}://${host}`;
}

/** Makes storage paths usable by mobile clients that do not resolve relative URLs. */
export function absolutizeStorefrontMediaUrls<T>(value: T, req: Request): T {
  const origin = requestOrigin(req);
  if (!origin) return value;

  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') {
      return item.startsWith('/storage/') ? `${origin}${item}` : item;
    }
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') {
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).map(([key, entry]) => [key, visit(entry)]),
      );
    }
    return item;
  };

  return visit(value) as T;
}
