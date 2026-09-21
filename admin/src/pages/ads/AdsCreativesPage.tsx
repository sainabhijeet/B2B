import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import type { AdCreativeFromApi } from '@/lib/adsApi';
import { fetchAdCampaigns } from '@/lib/adsApi';

export function AdsCreativesPage() {
  const [rows, setRows] = useState<AdCreativeFromApi[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const campaigns = await fetchAdCampaigns();
      const flat: AdCreativeFromApi[] = [];
      for (const c of campaigns) {
        for (const cr of c.creatives ?? []) {
          flat.push(cr);
        }
      }
      setRows(flat);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load creatives.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const title = useMemo(
    () => (loading ? 'Ad creatives (loading…)' : `Ad creatives (${rows.length})`),
    [loading, rows.length],
  );

  return (
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
          { id: 'title', header: 'Ad title', cell: (r) => r.title },
          {
            id: 'desc',
            header: 'Description',
            cell: (r) => r.description ?? '—',
          },
          {
            id: 'target',
            header: 'Target URL',
            cell: (r) => <span className="text-xs break-all">{r.targetUrl}</span>,
          },
          { id: 'cta', header: 'CTA', cell: (r) => r.cta ?? '—' },
          {
            id: 'campaign',
            header: 'Campaign ID',
            cell: (r) => <span className="font-mono text-[10px]">{r.campaignId}</span>,
          },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Add creatives via API <span className="font-mono">POST /api/v1/ads/campaigns/:id/creatives</span> (UI hook-up
        can follow).
      </p>
    </ResourcePanel>
  );
}
