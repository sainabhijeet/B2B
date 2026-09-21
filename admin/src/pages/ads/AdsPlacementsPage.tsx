import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { AD_PLACEMENT_OPTIONS } from '@/lib/adsDemoData';
import { ApiError } from '@/lib/apiClient';
import { fetchAdCampaigns } from '@/lib/adsApi';

type PlacementRow = { placement: string; campaignCount: number; activeCount: number };

export function AdsPlacementsPage() {
  const [rows, setRows] = useState<PlacementRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const campaigns = await fetchAdCampaigns();
      const map = new Map<string, { total: number; active: number }>();
      for (const c of campaigns) {
        const cur = map.get(c.placement) ?? { total: 0, active: 0 };
        cur.total += 1;
        if (c.status.toUpperCase() === 'ACTIVE') cur.active += 1;
        map.set(c.placement, cur);
      }
      for (const p of AD_PLACEMENT_OPTIONS) {
        if (!map.has(p)) map.set(p, { total: 0, active: 0 });
      }
      setRows(
        [...map.entries()]
          .map(([placement, v]) => ({
            placement,
            campaignCount: v.total,
            activeCount: v.active,
          }))
          .sort((a, b) => a.placement.localeCompare(b.placement)),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load placements.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const title = useMemo(
    () => (loading ? 'Ad placements (loading…)' : 'Ad placements'),
    [loading],
  );

  return (
    <div className="space-y-4">
      <ResourcePanel
        title={title}
        toolbar={
          <button type="button" className={adminBtnSecondary} onClick={() => void load()}>
            Refresh
          </button>
        }
      >
        {error ? (
          <div className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">{error}</div>
        ) : null}
        <DataTable
          columns={[
            { id: 'name', header: 'Placement', cell: (r) => r.placement },
            {
              id: 'total',
              header: 'Campaigns',
              cell: (r) => r.campaignCount.toLocaleString(),
            },
            {
              id: 'active',
              header: 'Active',
              cell: (r) => r.activeCount.toLocaleString(),
            },
          ]}
          rows={rows}
          rowKey={(r) => r.placement}
        />
      </ResourcePanel>
      <p className="text-xs text-slate-500">
        Placement is stored on each campaign. Table merges known slots from the catalog with live usage from the API.
      </p>
    </div>
  );
}
