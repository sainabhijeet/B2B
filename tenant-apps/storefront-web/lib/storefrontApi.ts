import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import { tenantIdFromCustomerToken } from "@/lib/customer-token-tenant";

/**
 * Server-side calls to Nest must forward the browser host so `TenantMiddleware` resolves the tenant
 * (see backend `TenantResolver`: `X-Storefront-Host`).
 */
export function getStorefrontApiBase(): string {
  const raw = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
  return raw.replace(/\/$/, "");
}

/**
 * Forwards the storefront host to Nest (`X-Storefront-Host`) so `TenantResolver` can map
 * `{slug}.localhost` → tenant. Prefer the **browser** host when running on the client so
 * `http://{slug}.localhost:5175` works even if `NEXT_PUBLIC_SITE_URL` still says `localhost:5175`.
 */
export function storefrontHostHeader(): Record<string, string> {
  if (typeof window !== "undefined" && window.location?.host) {
    return { "X-Storefront-Host": window.location.host };
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return {};
  try {
    const host = new URL(site).host;
    if (host) return { "X-Storefront-Host": host };
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Use from **Server Components** / RSC `fetch`: reads the incoming request `Host` (or
 * `x-forwarded-host`) so catalog calls get the same tenant as `resolveStorefrontTheme`.
 * Without this, `storefrontHostHeader()` often returns `{}` when `NEXT_PUBLIC_SITE_URL` is unset,
 * Nest cannot resolve tenant → storefront APIs fail → callers fall back to mock catalog data.
 */
export async function storefrontHostHeaderAsync(): Promise<Record<string, string>> {
  if (typeof window !== "undefined" && window.location?.host) {
    return { "X-Storefront-Host": window.location.host };
  }
  try {
    const { cookies, headers } = await import("next/headers");
    const [h, cookieStore] = await Promise.all([headers(), cookies()]);
    const tenantId =
      h.get("x-storefront-tenant-id")?.trim() ||
      cookieStore.get("storefront_tenant_id")?.value.trim();
    if (
      tenantId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        tenantId,
      )
    ) {
      return { "X-Tenant-Id": tenantId };
    }

    const tenantSlug = (
      h.get("x-storefront-tenant")?.trim() ||
      cookieStore.get("storefront_tenant")?.value.trim() ||
      ""
    ).toLowerCase();
    if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(tenantSlug)) {
      return { "X-Storefront-Host": `${tenantSlug}.localhost` };
    }

    const sessionTenantId = tenantIdFromCustomerToken(cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value);
    if (sessionTenantId) return { "X-Tenant-Id": sessionTenantId };

    const host =
      h.get("x-forwarded-host") ?? h.get("x-vercel-forwarded-host") ?? h.get("host") ?? "";
    if (host.trim()) return { "X-Storefront-Host": host.trim() };
  } catch {
    /* outside a request or headers unavailable */
  }
  return storefrontHostHeader();
}
