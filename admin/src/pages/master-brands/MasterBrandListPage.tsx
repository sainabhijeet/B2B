import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { deleteMasterBrand, listMasterBrands, type MasterBrandRow } from '@/lib/masterBrandsApi';

function fmtCreated(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';

export function MasterBrandListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MasterBrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMasterBrands({
        search: appliedSearch.trim() || undefined,
        status: appliedStatus || undefined,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load master brands');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, appliedStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => [...rows].sort((a, b) => a.name.localeCompare(b.name)), [rows]);

  return (
    <div>
      <PageHeader
        title="Master brands"
        description="Platform catalog for distributor brand pickers. Active rows appear in tenant GET /brands and GET /brands/options (merged with custom tenant-only brands)."
        actions={
          <Link to="/master-brands/new" className={adminBtnPrimary}>
            Add master brand
          </Link>
        }
      />

      <ResourcePanel>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-3 py-2">
          <div className="min-w-[10rem] flex-1">
            <label className={lbl}>Search</label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name or slug…"
              className="w-full rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            type="button"
            className={adminBtnSecondary}
            onClick={() => {
              setAppliedSearch(searchInput);
              setAppliedStatus(statusInput);
            }}
          >
            Apply
          </button>
        </div>

        {error ? (
          <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {error}{' '}
            <button type="button" className="font-medium text-indigo-700 underline" onClick={() => void load()}>
              Retry
            </button>
          </p>
        ) : null}
        {loading ? <p className="px-3 py-2 text-xs text-slate-500">Loading…</p> : null}

        <DataTable
          columns={[
            {
              id: 'logo',
              header: 'Logo',
              className: 'w-14',
              cell: (r) =>
                r.logoUrl ? (
                  <img
                    src={r.logoUrl}
                    alt=""
                    className="h-8 w-8 rounded border border-slate-100 object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-slate-400">—</span>
                ),
            },
            { id: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
            { id: 'slug', header: 'Slug', cell: (r) => <code className="text-xs">{r.slug}</code> },
            {
              id: 'industry',
              header: 'Industry',
              cell: (r) => <span className="text-xs text-slate-700">{r.industryName ?? '—'}</span>,
            },
            {
              id: 'status',
              header: 'Status',
              cell: (r) => (
                <span className={r.status === 'active' ? 'text-xs font-medium text-emerald-700' : 'text-xs text-slate-500'}>
                  {r.status}
                </span>
              ),
            },
            { id: 'created', header: 'Created', cell: (r) => <span className="text-xs">{fmtCreated(r.createdAt)}</span> },
            {
              id: 'actions',
              header: 'Actions',
              className: 'min-w-[10rem]',
              cell: (r) => (
                <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                  <Link to={`/master-brands/${r.id}/edit`} className="text-xs font-medium text-indigo-600 hover:underline">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 hover:underline"
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Delete this master brand? Tenant shadow rows keep their copy but lose the master link (DB SET NULL). Prefer setting status to Inactive instead.',
                        )
                      ) {
                        return;
                      }
                      void (async () => {
                        try {
                          await deleteMasterBrand(r.id);
                          await load();
                        } catch (e) {
                          window.alert(e instanceof ApiError ? e.message : 'Delete failed');
                        }
                      })();
                    }}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={sorted}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/master-brands/${r.id}/edit`)}
        />
      </ResourcePanel>
      <p className="mt-2 text-xs text-slate-500">
        DB: <code className="text-xs">public.master_brands</code> (slug unique case-insensitive). Distributors:{' '}
        <code className="text-xs">GET /brands/options</code>.
      </p>
    </div>
  );
}
