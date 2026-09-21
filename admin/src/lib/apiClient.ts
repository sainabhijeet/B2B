import { apiUrl } from './apiBase';
import {
  clearAuth,
  getAccessToken,
  getDeviceId,
  setTokens,
} from './authStorage';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function formatErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const o = body as { message?: unknown; error?: unknown; debug?: unknown };
  let msg = fallback;
  if (typeof o.message === 'string') msg = o.message;
  else if (Array.isArray(o.message)) msg = o.message.join(', ');
  else if (typeof o.error === 'string') msg = o.error;
  if (typeof o.debug === 'string' && o.debug.trim() && !msg.includes(o.debug)) {
    msg = `${msg} — ${o.debug}`;
  }
  return msg;
}

async function refreshAccess(): Promise<boolean> {
  const deviceId = getDeviceId();
  if (!deviceId) return false;
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
    credentials: 'include',
  };
  let res: Response;
  try {
    res = await fetch(apiUrl('/auth/refresh'), init);
  } catch {
    if (!import.meta.env.DEV) return false;
    try {
      res = await fetch('/api/v1/auth/refresh', init);
    } catch {
      return false;
    }
  }
  if (!res.ok) return false;
  const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
  if (!data.accessToken || !data.refreshToken) return false;
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

type FetchOptions = RequestInit & { skipAuth?: boolean };

async function rawFetch(path: string, init: FetchOptions, retried: boolean): Promise<Response> {
  const { skipAuth, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (
    rest.body != null &&
    typeof rest.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { ...rest, headers, credentials: 'include' });
  } catch (e) {
    if (import.meta.env.DEV) {
      const p = path.startsWith('/') ? path : `/${path}`;
      const proxyUrl = `/api/v1${p}`;
      let proxyRes: Response | null = null;
      try {
        proxyRes = await fetch(proxyUrl, { ...rest, headers, credentials: 'include' });
      } catch {
        // Fall through to the regular network error below.
      }
      if (proxyRes) {
        if (proxyRes.status === 401 && !skipAuth && !retried) {
          const ok = await refreshAccess();
          if (ok) return rawFetch(path, init, true);
          clearAuth();
        }
        return proxyRes;
      }
    }
    const isTypeError = e instanceof TypeError;
    const msg = isTypeError && e.message === 'Failed to fetch'
      ? 'Network error: API unreachable or blocked. In dev, run the backend on :3000 (or set admin VITE_DEV_PROXY_TARGET) and restart `npm run dev`; if you use VITE_API_URL, add this admin origin to backend CORS_ORIGINS (include http://127.0.0.1:5173 if you open the app via 127.0.0.1).'
      : e instanceof Error
        ? e.message
        : 'Network error';
    throw new ApiError(0, msg, e);
  }
  if (res.status === 401 && !skipAuth && !retried) {
    const ok = await refreshAccess();
    if (ok) return rawFetch(path, init, true);
    clearAuth();
  }
  return res;
}

export async function apiFetch<T>(path: string, init: FetchOptions = {}): Promise<T> {
  const res = await rawFetch(path, init, false);
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      formatErrorMessage(body, res.statusText || 'Request failed'),
      body,
    );
  }
  return body as T;
}

export function apiGet<T>(path: string, init: FetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, { ...init, method: 'GET' });
}

export function apiPost<T>(path: string, jsonBody: unknown, init: FetchOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  return apiFetch<T>(path, {
    ...init,
    method: 'POST',
    headers,
    body: JSON.stringify(jsonBody),
  });
}

/** Multipart POST (e.g. file upload). Do not set Content-Type — browser sets boundary. */
export function apiPostForm<T>(path: string, formData: FormData, init: FetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, {
    ...init,
    method: 'POST',
    body: formData,
  });
}

export function apiPut<T>(path: string, jsonBody: unknown, init: FetchOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  return apiFetch<T>(path, {
    ...init,
    method: 'PUT',
    headers,
    body: JSON.stringify(jsonBody),
  });
}

export function apiPatch<T>(path: string, jsonBody: unknown, init: FetchOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  return apiFetch<T>(path, {
    ...init,
    method: 'PATCH',
    headers,
    body: JSON.stringify(jsonBody),
  });
}

export function apiDelete<T>(path: string, init: FetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, { ...init, method: 'DELETE' });
}
