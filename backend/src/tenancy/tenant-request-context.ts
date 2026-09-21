import { AsyncLocalStorage } from 'node:async_hooks';

export type TenantRequestState = {
  tenantId: string | null;
  schemaName: string | null;
  tenantSchemaProvisioned: boolean;
};

export const tenantRequestAls = new AsyncLocalStorage<TenantRequestState>();

export function getTenantRequestContext(): TenantRequestState | undefined {
  return tenantRequestAls.getStore();
}
