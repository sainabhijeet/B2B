/**
 * Directory containing theme assets, given the full URL or path to `theme.json`.
 * Examples:
 * - `https://cdn/x/theme.json` → `https://cdn/x/`
 * - `/storage/.../theme.json` → directory URL for resolving relative asset paths
 */
export function directoryUrlFromManifestPath(manifestPath: string): string {
  const trimmed = manifestPath.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    let pathname = u.pathname;
    if (pathname.endsWith("/theme.json")) {
      pathname = pathname.slice(0, -"/theme.json".length) || "/";
    } else if (pathname.endsWith("theme.json")) {
      pathname = pathname.slice(0, -"theme.json".length);
    }
    u.pathname = pathname.endsWith("/") ? pathname : `${pathname}/`;
    u.hash = "";
    u.search = "";
    return u.toString();
  } catch {
    let p = trimmed.replace(/\\/g, "/");
    if (p.endsWith("/theme.json")) {
      p = p.slice(0, -"/theme.json".length);
    } else if (p.endsWith("theme.json")) {
      p = p.slice(0, -"theme.json".length);
    }
    return p.endsWith("/") ? p : `${p}/`;
  }
}
