export function safeCustomerNextPath(value: string | null | undefined, fallback = "/"): string {
  const candidate = value?.trim() ?? "";
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/login")) return fallback;
  return candidate;
}

export function customerLoginHref(nextPath: string): string {
  return `/login?next=${encodeURIComponent(safeCustomerNextPath(nextPath))}`;
}

const STOREFRONT_CONTEXT_KEYS = [
  "tenantId",
  "tenant",
  "wbPreview",
  "previewMode",
  "previewLanguage",
  "previewState",
  "previewPrimaryColor",
  "previewSecondaryColor",
  "previewFontFamily",
  "previewBorderRadius",
] as const;

export function storefrontHrefWithCurrentContext(path: string): string {
  if (typeof window === "undefined") return path;
  const current = new URL(window.location.href);
  const destination = new URL(path, current.origin);
  for (const key of STOREFRONT_CONTEXT_KEYS) {
    const value = current.searchParams.get(key);
    if (value != null) destination.searchParams.set(key, value);
  }
  return `${destination.pathname}${destination.search}`;
}

export function customerLoginHrefWithCurrentContext(nextPath: string): string {
  return storefrontHrefWithCurrentContext(customerLoginHref(nextPath));
}

export function currentPageCustomerLoginHref(): string {
  if (typeof window === "undefined") return "/login";
  return customerLoginHrefWithCurrentContext(`${window.location.pathname}${window.location.search}`);
}
