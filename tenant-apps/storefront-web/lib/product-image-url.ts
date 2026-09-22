import { backendOriginFromApiUrl } from "@/lib/api-origin";

/** Product images may be stored as `/storage/...`; browsers need the API origin. */
export function productImageUrl(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url) return null;
  if (/^https?:\/\//iu.test(url) || /^data:image\//iu.test(url)) return url;
  if (url.startsWith("//") || /^[a-z][a-z\d+.-]*:/iu.test(url)) return null;
  let origin = backendOriginFromApiUrl();
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      origin = new URL(process.env.NEXT_PUBLIC_API_URL).origin;
    } catch {
      // Keep the working server API origin if the public setting is invalid.
    }
  }
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}
