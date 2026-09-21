import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import {
  getGlobalMetaTemplateLibrary,
  getOverview,
  syncGlobalMetaTemplateLibraryAll,
  syncGlobalMetaTemplateLibraryTenant,
  type GlobalMetaTemplateRow,
  type WhatsappOverviewRow,
} from '../api/whatsappApi';

type Flash = { type: 'ok' | 'err'; message: string } | null;

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function WhatsAppPlatformLibraryPage() {
  const [rows, setRows] = useState<GlobalMetaTemplateRow[]>([]);
  const [tenants, setTenants] = useState<WhatsappOverviewRow[]>([]);
  const [filterWaba, setFilterWaba] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [applied, setApplied] = useState({ waba_id: '', category: '', status: '' });
  const [syncTenantId, setSyncTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncAllBusy, setSyncAllBusy] = useState(false);
  const [syncOneBusy, setSyncOneBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFlash(null);
    try {
      const [items, overview] = await Promise.all([
        getGlobalMetaTemplateLibrary({
          waba_id: applied.waba_id || undefined,
          category: applied.category || undefined,
          status: applied.status || undefined,
        }),
        getOverview(400),
      ]);
      setRows(items);
      setTenants(overview.filter((t) => t.wa_active && t.waba_id));
    } catch (e) {
      setFlash({
        type: 'err',
        message: e instanceof ApiError ? e.message : 'Failed to load template library',
      });
    } finally {
      setLoading(false);
    }
  }, [applied.waba_id, applied.category, applied.status]);

  useEffect(() => {
    void load();
  }, [load]);

  const wabaOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      if (r.waba_id) s.add(r.waba_id);
    }
    for (const t of tenants) {
      if (t.waba_id) s.add(t.waba_id);
    }
    return [...s].sort();
  }, [rows, tenants]);

  const onApplyFilters = () => {
    setApplied({
      waba_id: filterWaba.trim(),
      category: filterCategory.trim(),
      status: filterStatus.trim(),
    });
  };

  const onSyncAll = async () => {
    setSyncAllBusy(true);
    setFlash(null);
    try {
      const { total_synced, results } = await syncGlobalMetaTemplateLibraryAll();
      const failed = results.filter((r) => r.error).length;
      setFlash({
        type: failed ? 'err' : 'ok',
        message: `Global sync: ${total_synced} row(s) upserted across ${results.length} WABA(s). ${failed} WABA error(s).`,
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

  const onSyncTenant = async () => {
    if (!syncTenantId) {
      setFlash({ type: 'err', message: 'Pick a tenant with an active line.' });
      return;
    }
    setSyncOneBusy(true);
    setFlash(null);
    try {
      const { waba_id, synced } = await syncGlobalMetaTemplateLibraryTenant(syncTenantId);
      setFlash({ type: 'ok', message: `Synced WABA ${waba_id}: ${synced} template row(s).` });
      await load();
    } catch (e) {
      setFlash({
        type: 'err',
        message: e instanceof ApiError ? e.message : 'Tenant sync failed',
      });
    } finally {
      setSyncOneBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-sm font-semibold text-slate-900">WhatsApp · Global template library</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/whatsapp" className={adminBtnSecondary}>
            ← Overview
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-slate-600">
        Central store: all Meta template categories and statuses per WABA. Tenant-specific hybrid tables are unchanged;
        use this screen to audit and bulk-sync from every configured line.
      </p>

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

      <ResourcePanel title="Sync">
        <div className="flex flex-col gap-3 p-2 sm:flex-row sm:flex-wrap sm:items-end">
          <button type="button" className={adminBtnPrimary} disabled={syncAllBusy} onClick={() => void onSyncAll()}>
            {syncAllBusy ? 'Syncing all WABAs…' : 'Sync all (distinct WABAs)'}
          </button>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Tenant</label>
              <select
                className="min-w-[12rem] rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs"
                value={syncTenantId}
                onChange={(e) => setSyncTenantId(e.target.value)}
              >
                <option value="">— Select tenant —</option>
                {tenants.map((t) => (
                  <option key={t.tenant_id} value={t.tenant_id}>
                    {t.tenant_name} ({t.tenant_slug})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={adminBtnSecondary}
              disabled={syncOneBusy || !syncTenantId}
              onClick={() => void onSyncTenant()}
            >
              {syncOneBusy ? 'Syncing…' : 'Sync selected tenant'}
            </button>
          </div>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Filters">
        <div className="grid max-w-3xl gap-2 p-2 sm:grid-cols-3">
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">WABA</label>
            <input
              list="waba-datalist"
              className="w-full rounded-sm border border-slate-200 px-2 py-1.5 font-mono text-[11px]"
              value={filterWaba}
              onChange={(e) => setFilterWaba(e.target.value)}
              placeholder="WABA id"
            />
            <datalist id="waba-datalist">
              {wabaOptions.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Category</label>
            <input
              className="w-full rounded-sm border border-slate-200 px-2 py-1.5 text-[11px]"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              placeholder="e.g. UTILITY"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Status</label>
            <input
              className="w-full rounded-sm border border-slate-200 px-2 py-1.5 text-[11px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="e.g. APPROVED"
            />
          </div>
        </div>
        <div className="px-2 pb-2">
          <button type="button" className={adminBtnSecondary} onClick={() => void onApplyFilters()}>
            Apply filters
          </button>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Templates">
        {loading ? (
          <p className="p-3 text-xs text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-3 text-xs text-slate-600">No rows yet. Run “Sync all” or sync a tenant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-600">
                  <th className="px-2 py-1.5">WABA</th>
                  <th className="px-2 py-1.5">Template</th>
                  <th className="px-2 py-1.5">Language</th>
                  <th className="px-2 py-1.5">Category</th>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5">Last sync</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.waba_id}-${r.template_name}-${r.language}-${i}`} className="border-b border-slate-100">
                    <td className="max-w-[140px] truncate px-2 py-1 font-mono text-slate-800" title={r.waba_id}>
                      {r.waba_id}
                    </td>
                    <td className="px-2 py-1 font-mono text-slate-900">{r.template_name}</td>
                    <td className="px-2 py-1">{r.language}</td>
                    <td className="px-2 py-1">{r.category ?? '—'}</td>
                    <td className="px-2 py-1">{r.status}</td>
                    <td className="whitespace-nowrap px-2 py-1 text-slate-600">{fmtDate(r.last_synced_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ResourcePanel>
    </div>
  );
}
