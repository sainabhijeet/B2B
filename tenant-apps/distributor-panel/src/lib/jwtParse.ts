/** Decode JWT payload (no signature verification — UI-only for tenant id). */
function base64UrlDecode(segment: string): string {
  const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(b64);
}

/** Matches Nest access JWT (snake_case `tenant_id` / `customer_id`, plus legacy camelCase). */
export type TenantJwtPayload = {
  sub: string;
  role: string;
  tenantId?: string | null;
  tenant_id?: string | null;
  customerId?: string | null;
  customer_id?: string | null;
};

export function parseTenantJwtPayload(accessToken: string): TenantJwtPayload | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(base64UrlDecode(parts[1])) as TenantJwtPayload;
  } catch {
    return null;
  }
}

export function getTenantIdFromAccessToken(accessToken: string | null): string | null {
  if (!accessToken) return null;
  const p = parseTenantJwtPayload(accessToken);
  if (!p) return null;
  const tid = p.tenant_id ?? p.tenantId;
  return typeof tid === "string" && tid.length > 0 ? tid : null;
}

export function getRoleFromAccessToken(accessToken: string | null): string | null {
  if (!accessToken) return null;
  const p = parseTenantJwtPayload(accessToken);
  return typeof p?.role === "string" && p.role.length > 0 ? p.role : null;
}

export function isStaffReadOnly(accessToken: string | null): boolean {
  return getRoleFromAccessToken(accessToken) === "STAFF";
}
