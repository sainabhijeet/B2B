const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** Only a storefront-routing hint; Nest still verifies the JWT before protected API access. */
export function tenantIdFromCustomerToken(token: string | undefined): string | null {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(atob(payload.replace(/-/gu, "+").replace(/_/gu, "/"))) as Record<string, unknown>;
    const tenantId = claims.tenant_id ?? claims.tenantId;
    if (claims.role !== "CUSTOMER" || typeof tenantId !== "string" || !UUID_PATTERN.test(tenantId)) {
      return null;
    }
    return tenantId;
  } catch {
    return null;
  }
}
