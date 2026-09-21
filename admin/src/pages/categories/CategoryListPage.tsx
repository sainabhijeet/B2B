import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { CatalogTenantSelect } from '@/components/catalog/CatalogTenantSelect';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { deleteCategory, fetchCategories, updateCategory, type CatalogCategory } from '@/lib/catalogApi';

const PAGE_SIZE = 20;

export function CategoryListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const scope = params.get('tenantId') || 'global';
  const [rows, setRows] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCategories({
        globalOnly: scope === 'global',
        tenantId: scope === 'global' ? undefined : scope,
        includeGlobal: scope !== 'global',
        limit: 200,
      });
      setRows(response.data ?? []);
    } catch (cause) {
      setRows([]);
      setError(cause instanceof ApiError ? cause.message : 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [scope, search, status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) =>
      (!status || row.status === status) &&
      (!q || [row.name, row.slug, row.id].some((value) => value.toLowerCase().includes(q))),
    );
  }, [rows, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  async function remove(row: CatalogCategory) {
    if (!window.confirm(`Delete category “${row.name}”? This cannot be used for new products.`)) return;
    try {
      await deleteCategory(row.id);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not delete category.');
    }
  }

  async function disable(row: CatalogCategory) {
    try {
      await updateCategory(row.id, { status: row.status === 'active' ? 'inactive' : 'active' });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not update category status.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description={scope === 'global' ? 'Global master categories shared by matching tenant industries.' : 'Tenant categories plus available global master categories.'}
        actions={<Link to={`/categories/new${scope === 'global' ? '' : `?tenantId=${encodeURIComponent(scope)}`}`} className={adminBtnPrimary}>Add category</Link>}
      />
      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-sm border border-slate-200 bg-white p-3">
        <CatalogTenantSelect allowGlobal value={scope} onChange={(value) => setParams(value === 'global' ? {} : { tenantId: value })} />
        <label className="min-w-[12rem] flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Search
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, slug or ID…" className="mt-0.5 w-full rounded-sm border border-slate-200 px-2 py-1.5 text-xs font-normal normal-case" />
        </label>
        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-0.5 block rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs font-normal normal-case">
            <option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
          </select>
        </label>
        <button type="button" className={adminBtnSecondary} onClick={() => void load()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      {error ? <div className="mb-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div> : null}
      <ResourcePanel>
        <DataTable
          rows={pageRows}
          rowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/categories/${row.id}/edit${scope === 'global' ? '' : `?tenantId=${encodeURIComponent(scope)}`}`)}
          columns={[
            { id: 'name', header: 'Name', cell: (row) => <><div className="font-medium">{row.name}</div><code className="text-[10px] text-slate-500">{row.slug}</code></> },
            { id: 'scope', header: 'Scope', cell: (row) => row.tenantId ? 'Tenant' : 'Global master' },
            { id: 'parent', header: 'Parent', cell: (row) => row.parentId ? byId.get(row.parentId)?.name ?? 'Parent category' : '—' },
            { id: 'level', header: 'Level', cell: (row) => row.level },
            { id: 'status', header: 'Status', cell: (row) => <span className={row.status === 'active' ? 'text-emerald-700' : 'text-amber-700'}>{row.status}</span> },
            { id: 'visibility', header: 'Visible in', cell: (row) => [row.showInApp && 'App', row.showInWebsite && 'Web', row.showInMenu && 'Menu'].filter(Boolean).join(', ') || 'Hidden' },
            { id: 'actions', header: 'Actions', cell: (row) => <div className="flex gap-2" onClick={(e) => e.stopPropagation()}><Link className="text-indigo-600 hover:underline" to={`/categories/${row.id}/edit${scope === 'global' ? '' : `?tenantId=${encodeURIComponent(scope)}`}`}>Edit</Link><button type="button" className="text-slate-700 hover:underline" onClick={() => void disable(row)}>{row.status === 'active' ? 'Disable' : 'Enable'}</button><button type="button" className="text-red-600 hover:underline" onClick={() => void remove(row)}>Delete</button></div> },
          ]}
        />
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
          <span>{filtered.length} categories</span><div className="flex items-center gap-2"><button className={adminBtnSecondary} disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button><span>Page {safePage} / {totalPages}</span><button className={adminBtnSecondary} disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button></div>
        </div>
      </ResourcePanel>
    </div>
  );
}
