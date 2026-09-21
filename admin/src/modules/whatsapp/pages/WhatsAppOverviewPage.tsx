import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { getOverview, syncAllTemplates, syncTemplates, type WhatsappOverviewRow } from '../api/whatsappApi';
import { TenantWhatsAppCard } from '../components/TenantWhatsAppCard';

type Flash = { type: 'ok' | 'err'; message: string } | null;

export function WhatsAppOverviewPage() {
  const [rows, setRows] = useState<WhatsappOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncAllBusy, setSyncAllBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFlash(null);
    try {
      const data = await getOverview(300);
      setRows(data);
    } catch (e) {
      setFlash({
        type: 'err',
        message: e instanceof ApiError ? e.message : 'Failed to load overview',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSyncOne = async (tenantId: string) => {
    setSyncingId(tenantId);
    setFlash(null);
    try {
      const { synced, waba_id } = await syncTemplates(tenantId);
      setFlash({
        type: 'ok',
        message: `Synced ${synced} template(s) (WABA ${waba_id}).`,
      });
      await load();
    } catch (e) {
      setFlash({
        type: 'err',
        message: e instanceof ApiError ? e.message : 'Sync failed',
      });
    } finally {
      setSyncingId(null);
    }
  };

  const onSyncAll = async () => {
    setSyncAllBusy(true);
    setFlash(null);
    try {
      const { results } = await syncAllTemplates();
      const ok = results.filter((r) => r.synced != null).length;
      const fail = results.filter((r) => r.error).length;
      setFlash({
        type: fail ? 'err' : 'ok',
        message: `Sync-all finished: ${ok} ok, ${fail} failed (${results.length} tenants).`,
      });
      await load();
    } catch (e) {
      setFlash({
        type: 'err',
        message: e instanceof ApiError ? e.message : 'Sync-all failed',
      });
    } finally {
      setSyncAllBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-sm font-semibold text-slate-900">WhatsApp</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/whatsapp/platform-templates" className={adminBtnSecondary}>
            Global template library
          </Link>
          <Link to="/whatsapp/health" className={adminBtnSecondary}>
            Health dashboard
          </Link>
          <button type="button" className={adminBtnPrimary} disabled={syncAllBusy} onClick={() => void onSyncAll()}>
            {syncAllBusy ? 'Syncing all…' : 'Sync all tenants'}
          </button>
        </div>
      </div>

      {flash ? (
        <div
          className={
            flash.type === 'ok'
              ? 'rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900'
              : 'rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900'
          }
        >
          {flash.message}
        </div>
      ) : null}

      <ResourcePanel title="Tenants">
        {loading ? (
          <p className="p-3 text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto p-2">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="py-2 pr-2">Tenant</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Templates</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <TenantWhatsAppCard
                    key={row.tenant_id}
                    row={row}
                    syncing={syncingId === row.tenant_id}
                    onSync={onSyncOne}
                  />
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? <p className="p-2 text-xs text-slate-500">No tenants found.</p> : null}
          </div>
        )}
      </ResourcePanel>
    </div>
  );
}
