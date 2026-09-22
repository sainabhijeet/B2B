import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import { tenantIdFromCustomerToken } from "@/lib/customer-token-tenant";

const TENANT_ID_COOKIE = "storefront_tenant_id";
const TENANT_SLUG_COOKIE = "storefront_tenant";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;

function cookieValue(cookieHeader: string, name: string): string {
  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    const key = entry.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(entry.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Resolves the same tenant context for browser -> Next BFF -> Nest requests that
 * regular Server Components receive from `middleware.ts`.
 *
 * API route handlers are excluded from that middleware, so preview tenant
 * cookies must be forwarded explicitly or authentication can target no tenant.
 */
export function storefrontTenantHeadersFromRequest(
  request: Request,
): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const tenantId = (
    request.headers.get("x-storefront-tenant-id") ??
    request.headers.get("x-tenant-id") ??
    cookieValue(cookieHeader, TENANT_ID_COOKIE)
  ).trim();

  if (UUID_PATTERN.test(tenantId)) {
    return { "X-Tenant-Id": tenantId };
  }

  const tenantSlug = (
    request.headers.get("x-storefront-tenant") ??
    cookieValue(cookieHeader, TENANT_SLUG_COOKIE)
  )
    .trim()
    .toLowerCase();

  if (SLUG_PATTERN.test(tenantSlug)) {
    return { "X-Storefront-Host": `${tenantSlug}.localhost` };
  }

  const sessionTenantId = tenantIdFromCustomerToken(cookieValue(cookieHeader, CUSTOMER_ACCESS_COOKIE));
  if (sessionTenantId) return { "X-Tenant-Id": sessionTenantId };

  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("x-vercel-forwarded-host") ??
    request.headers.get("host") ??
    ""
  ).trim();

  return host ? { "X-Storefront-Host": host } : {};
}
