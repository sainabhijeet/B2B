import { apiGet, apiPost, apiPut } from '@/lib/apiClient';

const base = '/platform/whatsapp';

export type PlatformWhatsappConfig = {
  tenant_id: string;
  phone_number_id: string | null;
  waba_id: string | null;
  use_own_token: boolean;
  is_active: boolean;
  access_token_configured: boolean;
  /** True if Meta Graph calls can be made (line token or platform `WHATSAPP_SHARED_TOKEN` / `WHATSAPP_CLOUD_ACCESS_TOKEN`). */
  graph_api_token_configured: boolean;
  webhook_verified: boolean;
  last_meta_sync_at: string | null;
  last_meta_sync_error: string | null;
  last_message_sent_at: string | null;
};

export type WhatsappOverviewRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  wa_active: boolean;
  phone_number_id: string | null;
  waba_id: string | null;
  graph_api_token_configured: boolean;
  templates_count: number;
  last_meta_sync_error: string | null;
  webhook_verified: boolean;
};

export type MetaTemplateRow = {
  template_name: string;
  category: string | null;
  status: string;
  language: string;
  last_synced_at: string | null;
};

export type TenantHealth = {
  token_valid: boolean;
  templates_count: number;
  last_sync: string | null;
  webhook_status: string;
};

export type HealthSummary = {
  active_whatsapp_tenants: number;
  lines_with_sync_errors: number;
  total_meta_template_rows: number;
  unverified_webhooks: number;
};

export type TemplateMappingRow = {
  template_key: string;
  meta_template_name: string | null;
  is_active: boolean;
};

export type UpdateWhatsappConfigPayload = {
  phoneNumberId: string;
  whatsappBusinessAccountId?: string;
  accessToken?: string;
  useOwnToken?: boolean;
  isActive?: boolean;
  webhookVerifyToken?: string;
  appSecret?: string;
  validateTokenOnSave?: boolean;
};

export async function getOverview(limit = 200): Promise<WhatsappOverviewRow[]> {
  const r = await apiGet<{ success: boolean; data: WhatsappOverviewRow[] }>(
    `${base}/overview?limit=${encodeURIComponent(String(limit))}`,
  );
  return r.data;
}

export async function getTenantConfig(tenantId: string): Promise<PlatformWhatsappConfig> {
  const r = await apiGet<{ success: boolean; data: PlatformWhatsappConfig }>(
    `${base}/config/${encodeURIComponent(tenantId)}`,
  );
  return r.data;
}

export async function updateTenantConfig(
  tenantId: string,
  data: UpdateWhatsappConfigPayload,
): Promise<PlatformWhatsappConfig> {
  const r = await apiPut<{ success: boolean; data: PlatformWhatsappConfig }>(
    `${base}/config/${encodeURIComponent(tenantId)}`,
    data,
  );
  return r.data;
}

export async function syncTemplates(tenantId: string): Promise<{ synced: number; waba_id: string }> {
  const r = await apiPost<{ success: boolean; data: { synced: number; waba_id: string } }>(
    `${base}/meta-templates/sync`,
    { tenantId },
  );
  return r.data;
}

export async function syncAllTemplates(): Promise<{
  results: Array<{ tenant_id: string; synced?: number; waba_id?: string; error?: string }>;
}> {
  const r = await apiPost<{
    success: boolean;
    data: {
      results: Array<{ tenant_id: string; synced?: number; waba_id?: string; error?: string }>;
    };
  }>(`${base}/meta-templates/sync-all`, {});
  return r.data;
}

export async function getTemplates(tenantId: string): Promise<MetaTemplateRow[]> {
  const r = await apiGet<{ success: boolean; data: MetaTemplateRow[] }>(
    `${base}/meta-templates/${encodeURIComponent(tenantId)}`,
  );
  return r.data;
}

export async function getTenantHealth(tenantId: string): Promise<TenantHealth> {
  const r = await apiGet<{ success: boolean; data: TenantHealth }>(
    `${base}/health/${encodeURIComponent(tenantId)}`,
  );
  return r.data;
}

export async function getHealthSummary(): Promise<HealthSummary> {
  const r = await apiGet<{ success: boolean; data: HealthSummary }>(`${base}/health`);
  return r.data;
}

export async function testConnection(tenantId: string): Promise<{ ok: boolean }> {
  const r = await apiPost<{ success: boolean; data: { ok: boolean } }>(
    `${base}/config/${encodeURIComponent(tenantId)}/test-connection`,
    {},
  );
  return r.data;
}

export async function getTemplateMappings(tenantId: string): Promise<TemplateMappingRow[]> {
  const r = await apiGet<{ success: boolean; data: { items: TemplateMappingRow[] } }>(
    `${base}/template-mappings/${encodeURIComponent(tenantId)}`,
  );
  return r.data.items;
}

export async function putTemplateMappings(
  tenantId: string,
  items: Array<{ templateKey: string; metaTemplateName: string; isActive?: boolean }>,
): Promise<TemplateMappingRow[]> {
  const r = await apiPut<{ success: boolean; data: { items: TemplateMappingRow[] } }>(
    `${base}/template-mappings/${encodeURIComponent(tenantId)}`,
    { items },
  );
  return r.data.items;
}

/** Central platform library (`platform_whatsapp_meta_templates`). */
export type GlobalMetaTemplateRow = {
  waba_id: string;
  template_name: string;
  category: string | null;
  status: string;
  language: string;
  last_synced_at: string | null;
  source_tenant_id: string | null;
};

export type GlobalMetaSyncWabaResult = {
  waba_id: string;
  synced: number;
  source_tenant_id?: string;
  error?: string;
};

export async function getGlobalMetaTemplateLibrary(filters?: {
  waba_id?: string;
  category?: string;
  status?: string;
}): Promise<GlobalMetaTemplateRow[]> {
  const p = new URLSearchParams();
  if (filters?.waba_id?.trim()) p.set('waba_id', filters.waba_id.trim());
  if (filters?.category?.trim()) p.set('category', filters.category.trim());
  if (filters?.status?.trim()) p.set('status', filters.status.trim());
  const q = p.toString();
  const r = await apiGet<{ success: boolean; data: { items: GlobalMetaTemplateRow[] } }>(
    `${base}/global-meta-templates${q ? `?${q}` : ''}`,
  );
  return r.data.items;
}

export async function syncGlobalMetaTemplateLibraryAll(): Promise<{
  total_synced: number;
  results: GlobalMetaSyncWabaResult[];
}> {
  const r = await apiPost<{
    success: boolean;
    data: { total_synced: number; results: GlobalMetaSyncWabaResult[] };
  }>(`${base}/global-meta-templates/sync-all`, {});
  return r.data;
}

export async function syncGlobalMetaTemplateLibraryTenant(
  tenantId: string,
): Promise<{ waba_id: string; synced: number }> {
  const r = await apiPost<{ success: boolean; data: { waba_id: string; synced: number } }>(
    `${base}/global-meta-templates/sync/${encodeURIComponent(tenantId)}`,
    {},
  );
  return r.data;
}
