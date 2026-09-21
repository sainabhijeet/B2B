import { Request } from 'express';
import { UserRole } from '../enums/user-role.enum';

/**
 * Normalized auth user after JWT verification.
 * Access tokens are signed with snake_case claims (`tenant_id`, `customer_id`); see `normalizeJwtAccessPayload`.
 */
export interface JwtUserPayload {
  sub: string;
  role: UserRole;
  tenantId: string | null;
  /** Set for B2B retailer JWTs (`customers` + OTP). */
  customerId?: string | null;
}

/** Raw JWT body (new tokens use snake_case; legacy tokens may use camelCase). */
export type JwtAccessPayloadRaw = Record<string, unknown>;

export function normalizeJwtAccessPayload(raw: JwtAccessPayloadRaw): JwtUserPayload {
  const sub = raw.sub;
  const role = raw.role;
  if (typeof sub !== 'string' || typeof role !== 'string') {
    throw new Error('Invalid access token payload.');
  }
  const tenantId =
    (typeof raw.tenant_id === 'string' ? raw.tenant_id : null) ??
    (typeof raw.tenantId === 'string' ? raw.tenantId : null);
  const customerIdRaw = raw.customer_id ?? raw.customerId;
  const customerId =
    typeof customerIdRaw === 'string' && customerIdRaw.length > 0 ? customerIdRaw : null;
  return {
    sub,
    role: role as UserRole,
    tenantId,
    customerId,
  };
}

export type AuthenticatedRequest = Request & { user: JwtUserPayload };
