/** Base for API calls: server-only `API_URL` first (Docker / SSR), else public URL. */
export function apiBaseUrl(): string {
  const raw = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1")
    .trim()
    .replace(/\/$/u, "");
  return raw || "http://localhost:3000/api/v1";
}

/** Origin of the Nest API (no `/api/v1` path) — used to fetch `/storage/...` when manifest URLs are relative. */
export function backendOriginFromApiUrl(): string {
  const u = apiBaseUrl();
  try {
    return new URL(u).origin;
  } catch {
    return "http://localhost:3000";
  }
}
