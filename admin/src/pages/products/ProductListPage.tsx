import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CatalogTenantSelect } from '@/components/catalog/CatalogTenantSelect';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { deleteProduct, fetchProducts, updateProduct, type CatalogProduct } from '@/lib/catalogApi';

export function ProductListPage() {
  const [params, setParams] = useSearchParams();
  const tenantId = params.get('tenantId') ?? '';
  const [rows, setRows] = useState<CatalogProduct[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) { setRows([]); setTotal(0); return; }
    setLoading(true); setError(null);
    try {
      const response = await fetchProducts({ tenantId, page, limit: 20, search, status });
      setRows(response.data ?? []); setTotal(response.meta?.total ?? 0); setTotalPages(Math.max(1, response.meta?.total_pages ?? 1));
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Could not load products.'); }
    finally { setLoading(false); }
  }, [page, search, status, tenantId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [tenantId, search, status]);

  async function toggle(row: CatalogProduct) {
    try { await updateProduct(row.id, { status: row.status === 'active' ? 'draft' : 'active' }); await load(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Could not update product.'); }
  }
  async function remove(row: CatalogProduct) {
    if (!window.confirm(`Delete product “${row.name}”?`)) return;
    try { await deleteProduct(row.id); await load(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Could not delete product.'); }
  }

  return <div>
    <PageHeader title="Products" description="Tenant products shown in the mobile app and storefront after publishing." actions={tenantId ? <Link to={`/products/new?tenantId=${encodeURIComponent(tenantId)}`} className={adminBtnPrimary}>Add product</Link> : undefined} />
    <div className="mb-3 flex flex-wrap items-end gap-2 rounded-sm border border-slate-200 bg-white p-3">
      <CatalogTenantSelect value={tenantId} onChange={(value) => setParams(value ? { tenantId: value } : {})} />
      <label className="min-w-[12rem] flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Search<input className="mt-0.5 w-full rounded-sm border border-slate-200 px-2 py-1.5 text-xs font-normal normal-case" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, SKU, brand or category…" /></label>
      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status<select className="mt-0.5 block rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs font-normal normal-case" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="draft">Draft</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <button type="button" className={adminBtnSecondary} onClick={() => void load()} disabled={!tenantId || loading}>{loading ? 'Loading…' : 'Refresh'}</button>
    </div>
    {!tenantId ? <div className="rounded-sm border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-900">Select a tenant/app first. Products cannot be global.</div> : null}
    {error ? <div className="mb-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div> : null}
    {tenantId ? <ResourcePanel><DataTable rows={rows} rowKey={(row) => row.id} columns={[
      { id: 'product', header: 'Product', cell: (row) => <><div className="font-medium">{row.name}</div><code className="text-[10px] text-slate-500">{row.sku}</code></> },
      { id: 'price', header: 'Price', cell: (row) => `₹${Number(row.price).toLocaleString('en-IN')}` },
      { id: 'stock', header: 'Stock', cell: (row) => row.totalStock ?? 0 },
      { id: 'status', header: 'Status', cell: (row) => <span className={row.status === 'active' ? 'text-emerald-700' : 'text-amber-700'}>{row.status}</span> },
      { id: 'updated', header: 'Updated', cell: (row) => new Date(row.updatedAt).toLocaleDateString('en-IN') },
      { id: 'actions', header: 'Actions', cell: (row) => <div className="flex flex-wrap gap-2"><Link className="text-indigo-600 hover:underline" to={`/products/${row.id}/edit?tenantId=${encodeURIComponent(tenantId)}`}>Edit</Link><button className="text-slate-700 hover:underline" onClick={() => void toggle(row)}>{row.status === 'active' ? 'Unpublish' : 'Publish'}</button><button className="text-red-600 hover:underline" onClick={() => void remove(row)}>Delete</button></div> },
    ]} /><div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-600"><span>{total} products</span><div className="flex items-center gap-2"><button className={adminBtnSecondary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button><span>Page {page} / {totalPages}</span><button className={adminBtnSecondary} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button></div></div></ResourcePanel> : null}
  </div>;
}
