const DEFAULT_ORIGIN = "http://localhost:3000";

/** Strip optional `/api/v1` suffix so both `http://host:3000` and `http://host:3000/api/v1` work. */
function normalizeApiOrigin(raw: string): string {
  let u = raw.trim().replace(/\/$/, "");
  if (u.endsWith("/api/v1")) {
    u = u.slice(0, -"/api/v1".length);
  }
  return u;
}

/**
 * API origin without `/api/v1`.
 * - If `VITE_API_URL` is set → use it (any env).
 * - Else in **dev** → `""` so requests stay same-origin and Vite `server.proxy` forwards `/api` to Nest.
 * - Else (prod build) → `http://localhost:3000` unless you set `VITE_API_URL` at build time.
 */
export function getApiOrigin(): string {
  const u = import.meta.env.VITE_API_URL;
  if (typeof u === "string" && u.trim() !== "") {
    return normalizeApiOrigin(u);
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return DEFAULT_ORIGIN;
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const origin = getApiOrigin();
  if (origin === "") {
    return `/api/v1${p}`;
  }
  return `${origin}/api/v1${p}`;
}

export function storageUrl(path: string | null | undefined): string {
  const raw = typeof path === "string" ? path.trim() : "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const p = raw.startsWith("/") ? raw : `/${raw}`;
  if (!p.startsWith("/storage/")) return raw;
  const origin = getApiOrigin() || DEFAULT_ORIGIN;
  return `${origin}${p}`;
}
