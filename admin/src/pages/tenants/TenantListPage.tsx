import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { mapTenantApiToListRow, fetchTenants } from '@/lib/tenantsApi';
import { type TenantListRow, type TenantStatus } from '@/lib/tenantDemoData';

const PLANS = ['', 'Free', 'Basic', 'Premium', 'Enterprise'] as const;
const PAGE_SIZE = 5;

function statusClass(s: TenantStatus) {
  const map: Record<TenantStatus, string> = {
    active: 'text-emerald-700',
    suspended: 'text-amber-700',
    pending: 'text-sky-700',
    blocked: 'text-red-700',
  };
  return map[s];
}

function readPlanParam(v: string | null): string {
  if (v === 'Free' || v === 'Basic' || v === 'Premium' || v === 'Enterprise') return v;
  return '';
}

function readStatusParam(v: string | null): TenantStatus | '' {
  if (v === 'active' || v === 'suspended' || v === 'pending' || v === 'blocked') return v;
  return '';
}

export function TenantListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<TenantListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState<TenantStatus | ''>('');
  const [sort, setSort] = useState<'created_desc' | 'created_asc'>('created_desc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchTenants();
      setRows(data.map(mapTenantApiToListRow));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load tenants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPlan(readPlanParam(searchParams.get('plan')));
    setStatus(readStatusParam(searchParams.get('status')));
    setPage(1);
  }, [searchParams]);

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.businessName.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.domain.toLowerCase().includes(q) ||
          r.phone.includes(q),
      );
    }
    if (plan) list = list.filter((r) => r.plan === plan);
    if (status) list = list.filter((r) => r.status === status);
    list.sort((a, b) =>
      sort === 'created_desc'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );
    return list;
  }, [rows, search, plan, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Distributors from the platform API — search, filter, and sort in the browser; pagination is client-side."
        actions={
          <button type="button" className={adminBtnSecondary} disabled={loading} onClick={() => void load()}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />
      {error ? (
        <div className="mb-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {error}{' '}
          <button type="button" className="font-semibold text-indigo-700 underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}
      <ResourcePanel>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-3 py-2">
          <div className="min-w-[8rem] flex-1">
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ID, business, email, domain…"
              className="w-full min-w-[8rem] rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Plan
            </label>
            <select
              value={plan}
              onChange={(e) => {
                const v = e.target.value;
                setPlan(v);
                setPage(1);
                setSearchParams(
                  (prev) => {
                    const n = new URLSearchParams(prev);
                    if (v) n.set('plan', v);
                    else n.delete('plan');
                    return n;
                  },
                  { replace: true },
                );
              }}
              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              {PLANS.map((p) =>
                p === '' ? (
                  <option key="all" value="">
                    All plans
                </option>
                ) : (
                  <option key={p} value={p}>
                    {p}
                </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                const v = e.target.value as TenantStatus | '';
                setStatus(v);
                setPage(1);
                setSearchParams(
                  (prev) => {
                    const n = new URLSearchParams(prev);
                    if (v) n.set('status', v);
                    else n.delete('status');
                    return n;
                  },
                  { replace: true },
                );
              }}
              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs capitalize"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Sort by date
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="created_desc">Newest first</option>
              <option value="created_asc">Oldest first</option>
            </select>
          </div>
          <button
            type="button"
            className={adminBtnSecondary}
            onClick={() => {
              setSearch('');
              setPlan('');
              setStatus('');
              setSort('created_desc');
              setPage(1);
              setSearchParams({}, { replace: true });
            }}
          >
            Reset
          </button>
        </div>

        {loading && rows.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500">Loading tenants…</div>
        ) : null}

        <DataTable
          columns={[
            {
              id: 'id',
              header: 'Tenant ID',
              cell: (r: TenantListRow) => <code className="text-xs">{r.id}</code>,
            },
            { id: 'business', header: 'Business name', cell: (r) => r.businessName },
            { id: 'owner', header: 'Owner', cell: (r) => r.ownerName },
            { id: 'email', header: 'Email', cell: (r) => r.email },
            { id: 'phone', header: 'Phone', cell: (r) => r.phone },
            { id: 'domain', header: 'Domain', cell: (r) => r.domain },
            { id: 'plan', header: 'Plan', cell: (r) => r.plan },
            {
              id: 'status',
              header: 'Status',
              cell: (r) => (
                <span className={`text-xs font-medium capitalize ${statusClass(r.status)}`}>
                  {r.status}
                </span>
              ),
            },
            { id: 'created', header: 'Created', cell: (r) => r.createdAt },
            {
              id: 'actions',
              header: 'Actions',
              className: 'min-w-[14rem] whitespace-normal',
              cell: (r) => (
                <div
                  className="flex max-w-[16rem] flex-wrap gap-x-2 gap-y-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link className="font-medium text-indigo-600 hover:underline" to={`/tenants/${r.id}/overview`}>
                    View
                  </Link>
                  <button type="button" className="font-medium text-slate-700 hover:underline">
                    Edit
                  </button>
                  <button type="button" className="font-medium text-amber-700 hover:underline">
                    Suspend
                  </button>
                  <button type="button" className="font-medium text-emerald-700 hover:underline">
                    Activate
                  </button>
                  <button type="button" className="font-medium text-indigo-600 hover:underline">
                    Upgrade
                  </button>
                  <button type="button" className="font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={pageRows}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/tenants/${r.id}/overview`)}
        />

        {!loading && !error && rows.length === 0 ? (
          <div className="border-t border-slate-100 px-3 py-6 text-center text-xs text-slate-500">
            No tenants yet. Run <code className="rounded bg-slate-100 px-1">npm run tenants:seed</code> on the backend
            or create one via API.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
          <span>
            {filtered.length === 0
              ? 'No results'
              : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={adminBtnSecondary}
              disabled={safePage <= 1}
              onClick={() =>
                setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))
              }
            >
              Prev
            </button>
            <span className="px-2">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              className={adminBtnSecondary}
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((p) => Math.min(totalPages, Math.max(1, p) + 1))
              }
            >
              Next
            </button>
          </div>
        </div>
      </ResourcePanel>
    </div>
  );
}
