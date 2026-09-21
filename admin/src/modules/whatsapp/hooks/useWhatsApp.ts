import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/apiClient';
import type { MetaTemplateRow, PlatformWhatsappConfig, TenantHealth } from '../api/whatsappApi';
import {
  getTemplates,
  getTenantConfig,
  getTenantHealth,
  syncTemplates,
  testConnection,
  updateTenantConfig,
  type UpdateWhatsappConfigPayload,
} from '../api/whatsappApi';

export function useWhatsApp(tenantId: string | undefined) {
  const [config, setConfig] = useState<PlatformWhatsappConfig | null>(null);
  const [templates, setTemplates] = useState<MetaTemplateRow[]>([]);
  const [health, setHealth] = useState<TenantHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [c, t, h] = await Promise.all([
        getTenantConfig(tenantId),
        getTemplates(tenantId),
        getTenantHealth(tenantId),
      ]);
      setConfig(c);
      setTemplates(t);
      setHealth(h);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setConfig(null);
      setTemplates([]);
      setHealth(null);
      setError(null);
      return;
    }
    void loadAll();
  }, [tenantId, loadAll]);

  const actions = {
    updateConfig: async (data: UpdateWhatsappConfigPayload) => {
      if (!tenantId) throw new Error('Missing tenant');
      const c = await updateTenantConfig(tenantId, data);
      setConfig(c);
      return c;
    },
    runSyncTemplates: async () => {
      if (!tenantId) throw new Error('Missing tenant');
      const r = await syncTemplates(tenantId);
      await loadAll();
      return r;
    },
    runTestConnection: async () => {
      if (!tenantId) throw new Error('Missing tenant');
      return testConnection(tenantId);
    },
    reload: loadAll,
  };

  return {
    config,
    templates,
    health,
    loading,
    error,
    actions,
  };
}
