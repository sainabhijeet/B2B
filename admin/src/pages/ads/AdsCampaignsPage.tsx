import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import type { AdCampaignFromApi } from '@/lib/adsApi';
import { deleteAdCampaign, fetchAdCampaigns, updateAdCampaign } from '@/lib/adsApi';

function statusClass(status: string) {
  const s = status.toLowerCase();
  const m: Record<string, string> = {
    active: 'text-emerald-700',
    paused: 'text-amber-700',
    scheduled: 'text-blue-700',
    ended: 'text-slate-500',
  };
  return m[s] ?? 'text-slate-600';
}

export function AdsCampaignsPage() {
  const [rows, setRows] = useState<AdCampaignFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setRows(await fetchAdCampaigns());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load campaigns.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPauseResume(row: AdCampaignFromApi) {
    const next = row.status.toUpperCase() === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    try {
      await updateAdCampaign(row.id, { status: next });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed.');
    }
  }

  async function onDelete(row: AdCampaignFromApi) {
    if (!window.confirm(`Delete campaign “${row.name}”? This removes creatives and stats.`)) return;
    try {
      await deleteAdCampaign(row.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed.');
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}
        </div>
      ) : null}
      <ResourcePanel
        title={loading ? 'Campaigns (loading…)' : 'Campaigns'}
        toolbar={
          <>
            <button type="button" className={adminBtnSecondary} onClick={() => void load()}>
              Refresh
            </button>
            <Link to="/ads/analytics" className={adminBtnSecondary}>
              Analytics
            </Link>
            <Link to="/ads/campaigns/new" className={adminBtnPrimary}>
              Create campaign
            </Link>
          </>
        }
      >
        <DataTable
          columns={[
            { id: 'name', header: 'Campaign name', cell: (r) => r.name },
            { id: 'placement', header: 'Placement', cell: (r) => r.placement },
            {
              id: 'status',
              header: 'Status',
              cell: (r) => (
                <span className={`text-xs font-semibold ${statusClass(r.status)}`}>
                  {r.status.toLowerCase()}
                </span>
              ),
            },
            { id: 'start', header: 'Start date', cell: (r) => r.startDate.slice(0, 10) },
            { id: 'end', header: 'End date', cell: (r) => r.endDate.slice(0, 10) },
            {
              id: 'impressions',
              header: 'Impressions',
              cell: (r) => (r.impressionsTotal ?? 0).toLocaleString(),
            },
            {
              id: 'clicks',
              header: 'Clicks',
              cell: (r) => (r.clicksTotal ?? 0).toLocaleString(),
            },
            {
              id: 'actions',
              header: 'Actions',
              cell: (r) => (
                <div className="flex flex-wrap gap-1">
                  <Link to={`/ads/campaigns/${r.id}/edit`} className={adminBtnSecondary}>
                    Edit
                  </Link>
                  <button type="button" className={adminBtnSecondary} onClick={() => void onPauseResume(r)}>
                    {r.status.toUpperCase() === 'PAUSED' ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-sm border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    onClick={() => void onDelete(r)}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows}
          rowKey={(r) => r.id}
        />
      </ResourcePanel>
      <p className="text-xs text-slate-500">
        Data from <span className="font-mono">GET /api/v1/ads/campaigns</span>. Free plans see ads; paid plans use{' '}
        <span className="font-mono">plan_limits.ads_enabled = false</span>.
      </p>
    </div>
  );
}
