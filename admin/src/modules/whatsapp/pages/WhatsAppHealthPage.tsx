import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { getHealthSummary, type HealthSummary } from '../api/whatsappApi';
import { HealthStatusCard } from '../components/HealthStatusCard';

export function WhatsAppHealthPage() {
  const [data, setData] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getHealthSummary();
      setData(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load health summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/whatsapp" className={adminBtnSecondary}>
          ← WhatsApp overview
        </Link>
      </div>

      <h1 className="text-sm font-semibold text-slate-900">WhatsApp health</h1>

      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">{error}</div>
      ) : null}

      <ResourcePanel title="Platform snapshot">
        <div className="p-3">
          {loading || !data ? (
            <p className="text-xs text-slate-500">Loading…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <HealthStatusCard title="Active WA tenants" value={data.active_whatsapp_tenants} />
              <HealthStatusCard
                title="Lines with sync errors"
                value={data.lines_with_sync_errors}
                subtitle="last_meta_sync_error set on line"
              />
              <HealthStatusCard
                title="Total Meta template rows"
                value={data.total_meta_template_rows}
                subtitle="Across all tenants"
              />
              <HealthStatusCard
                title="Unverified webhooks"
                value={data.unverified_webhooks}
                subtitle="Active lines, webhook not verified"
              />
            </div>
          )}
        </div>
      </ResourcePanel>

      <p className="text-[11px] text-slate-500">
        Per-tenant token, template count, and webhook status: open a tenant from{' '}
        <Link className="text-indigo-600 hover:underline" to="/whatsapp">
          overview
        </Link>{' '}
        → Configure (health strip can be extended later).
      </p>
    </div>
  );
}
