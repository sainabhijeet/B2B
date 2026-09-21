import type { CookieOptions, Request, Response } from 'express';

export const ACCESS_COOKIE = 'saas_access';
export const REFRESH_COOKIE = 'saas_refresh';

function sameSite(): CookieOptions['sameSite'] {
  const configured = String(process.env.AUTH_COOKIE_SAME_SITE ?? 'lax').toLowerCase();
  if (configured === 'strict' || configured === 'none') return configured;
  return 'lax';
}

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: sameSite(),
    priority: 'high',
  };
}

function refreshPath(): string {
  const prefix = String(process.env.API_PREFIX ?? 'api/v1').replace(/^\/+|\/+$/g, '');
  return `/${prefix}/auth`;
}

export function setAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  response.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    path: '/',
    maxAge: Math.max(Number(process.env.AUTH_COOKIE_ACCESS_MAX_AGE_MS) || 3_600_000, 60_000),
  });
  response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    path: refreshPath(),
    maxAge: Math.max(Number(process.env.AUTH_COOKIE_REFRESH_MAX_AGE_MS) || 604_800_000, 60_000),
  });
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: '/' });
  response.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: refreshPath() });
}

export function accessTokenFromCookie(request: Request): string | null {
  return typeof request.cookies?.[ACCESS_COOKIE] === 'string'
    ? request.cookies[ACCESS_COOKIE]
    : null;
}

export function refreshTokenFromCookie(request: Request): string | null {
  return typeof request.cookies?.[REFRESH_COOKIE] === 'string'
    ? request.cookies[REFRESH_COOKIE]
    : null;
}
