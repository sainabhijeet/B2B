import { apiGet, apiPost } from '@/lib/apiClient';

export type TenantWhatsappPlatformStatus = {
  isActive: boolean;
  phoneNumberId: string | null;
  webhookVerified: boolean;
  useOwnToken: boolean;
};

type StatusEnvelope = { success: boolean; data: TenantWhatsappPlatformStatus };

export async function fetchTenantWhatsappStatus(tenantId: string): Promise<TenantWhatsappPlatformStatus> {
  const body = await apiGet<StatusEnvelope>(`/platform/tenants/${tenantId}/whatsapp`);
  return body.data;
}

export async function enableTenantWhatsapp(
  tenantId: string,
  payload: {
    phoneNumberId: string;
    useOwnToken?: boolean;
    accessToken?: string;
    verifyToken?: string;
    appSecret?: string;
  },
): Promise<TenantWhatsappPlatformStatus> {
  const body = await apiPost<StatusEnvelope>(`/platform/tenants/${tenantId}/whatsapp/enable`, payload);
  return body.data;
}

export async function disableTenantWhatsapp(tenantId: string): Promise<TenantWhatsappPlatformStatus> {
  const body = await apiPost<StatusEnvelope>(`/platform/tenants/${tenantId}/whatsapp/disable`, {});
  return body.data;
}
