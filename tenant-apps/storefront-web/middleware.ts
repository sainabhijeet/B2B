import { NextResponse, type NextRequest } from "next/server";

const TENANT_ID_COOKIE = "storefront_tenant_id";
const TENANT_SLUG_COOKIE = "storefront_tenant";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

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
  const requestHeaders = new Headers(request.headers);

  if (tenantId) requestHeaders.set("x-storefront-tenant-id", tenantId);
  if (tenantSlug) requestHeaders.set("x-storefront-tenant", tenantSlug);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24,
  };

  if (queryTenantId) response.cookies.set(TENANT_ID_COOKIE, queryTenantId, cookieOptions);
  if (queryTenantSlug) response.cookies.set(TENANT_SLUG_COOKIE, queryTenantSlug, cookieOptions);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
