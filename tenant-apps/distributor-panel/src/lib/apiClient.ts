import { apiUrl } from "./apiBase";
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  getDeviceId,
  setTokens,
} from "./authStorage";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function formatErrorMessage(body: unknown, fallback: string, status: number): string {
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if ("message" in o) {
      const m = o.message;
      if (Array.isArray(m)) {
        const joined = m.filter((x): x is string => typeof x === "string").join(", ");
        if (joined.trim()) return joined;
      } else if (typeof m === "string" && m.trim()) {
        return m.trim();
      }
    }
    /** Nest `GlobalExceptionFilter` uses `{ success: false, error: string }`. */
    if (typeof o.error === "string" && o.error.trim()) {
      return o.error.trim();
    }
  }
  if (typeof body === "string") {
    const t = body.trim();
    if (t && t.length < 400 && !/^<!doctype/i.test(t)) return t;
  }
  if (status === 503) {
    return "Service is temporarily unavailable. If this is AI branding or logo generation, ensure the backend is running and OPENAI_API_KEY is set. GST verify needs APPYFLOW_GST_API_KEY.";
  }
  if (status === 502) {
    return "Bad gateway — the API could not be reached. Check VITE_API_URL and that the Nest server is up.";
  }
  if (status === 504) {
    return "The request timed out. Try again in a moment.";
  }
  return fallback;
}

async function refreshAccess(): Promise<boolean> {
  const deviceId = getDeviceId();
  const refreshToken = getRefreshToken();
  if (!deviceId || !refreshToken) return false;
  const res = await fetch(apiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, refreshToken }),
    credentials: "include",
  });
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
    typeof rest.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const url = apiUrl(path);
  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers, credentials: "include" });
  } catch (e) {
    const hint =
      e instanceof TypeError
        ? `Cannot reach API (${url}). Start Nest on port 3000, or set VITE_API_URL in distributor-panel/.env.local. In dev, requests use the Vite proxy /api → localhost:3000.`
        : `Request failed (${String(e)}): ${url}`;
    throw new ApiError(502, hint, e);
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
      formatErrorMessage(body, res.statusText || "Request failed", res.status),
      body,
    );
  }
  return body as T;
}

export function apiGet<T>(path: string, init: FetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, { ...init, method: "GET" });
}

export function apiPost<T>(path: string, jsonBody: unknown, init: FetchOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  return apiFetch<T>(path, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(jsonBody),
  });
}

export function apiDelete<T>(path: string, init: FetchOptions = {}): Promise<T> {
  return apiFetch<T>(path, { ...init, method: "DELETE" });
}

export function apiPatch<T>(path: string, jsonBody: unknown, init: FetchOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  return apiFetch<T>(path, {
    ...init,
    method: "PATCH",
    headers,
    body: JSON.stringify(jsonBody),
  });
}

export function apiPut<T>(path: string, jsonBody: unknown, init: FetchOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  return apiFetch<T>(path, {
    ...init,
    method: "PUT",
    headers,
    body: JSON.stringify(jsonBody),
  });
}
