import { NextResponse, type NextRequest } from "next/server";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import { tenantIdFromCustomerToken } from "@/lib/customer-token-tenant";

const TENANT_ID_COOKIE = "storefront_tenant_id";
const TENANT_SLUG_COOKIE = "storefront_tenant";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function isBareLocalhost(request: NextRequest): boolean {
  const hostname = request.nextUrl.hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function validTenantId(value: string | null): string {
  const normalized = value?.trim() ?? "";
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function validTenantSlug(value: string | null): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  return SLUG_PATTERN.test(normalized) ? normalized : "";
}

export function middleware(request: NextRequest) {
  const queryTenantId = validTenantId(request.nextUrl.searchParams.get("tenantId"));
  const queryTenantSlug = validTenantSlug(request.nextUrl.searchParams.get("tenant"));
  const tenantId = queryTenantId || validTenantId(request.cookies.get(TENANT_ID_COOKIE)?.value ?? null);
  const tenantSlug = queryTenantSlug || validTenantSlug(request.cookies.get(TENANT_SLUG_COOKIE)?.value ?? null);
  const sessionTenantId = !tenantId && !tenantSlug
    ? tenantIdFromCustomerToken(request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value)
    : null;
  const allowDevelopmentDefault = process.env.NODE_ENV === "development" && isBareLocalhost(request);
  const defaultTenantId = allowDevelopmentDefault
    ? validTenantId(process.env.NEXT_PUBLIC_STOREFRONT_DEFAULT_TENANT_ID ?? null)
    : "";
  const defaultTenantSlug = allowDevelopmentDefault
    ? validTenantSlug(process.env.NEXT_PUBLIC_STOREFRONT_DEFAULT_TENANT_SLUG ?? null)
    : "";
  const requestHeaders = new Headers(request.headers);

  const activeTenantId = tenantId || sessionTenantId || defaultTenantId;
  const activeTenantSlug = tenantSlug || defaultTenantSlug;
  if (activeTenantId) requestHeaders.set("x-storefront-tenant-id", activeTenantId);
  if (activeTenantSlug) requestHeaders.set("x-storefront-tenant", activeTenantSlug);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };

  if (queryTenantId) response.cookies.set(TENANT_ID_COOKIE, queryTenantId, cookieOptions);
  if (queryTenantSlug) response.cookies.set(TENANT_SLUG_COOKIE, queryTenantSlug, cookieOptions);
  if (!tenantId && !sessionTenantId && defaultTenantId) {
    response.cookies.set(TENANT_ID_COOKIE, defaultTenantId, cookieOptions);
  }
  if (!tenantSlug && defaultTenantSlug) {
    response.cookies.set(TENANT_SLUG_COOKIE, defaultTenantSlug, cookieOptions);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
