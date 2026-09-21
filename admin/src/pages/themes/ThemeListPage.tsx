import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useThemes } from '@/components/themes/ThemesContext';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { storageUrl } from '@/lib/apiBase';
import { demoHostToUrl, readDemoHost } from '@/lib/themesApi';

const PAGE_SIZE = 8;

function ThemeThumbnail({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-12 w-20 items-center justify-center rounded-md bg-gradient-to-br from-slate-100 to-slate-200 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        No preview
      </div>
    );
  }
  return (
    <img
      src={storageUrl(src)}
      alt={`${name} preview`}
      className="h-12 w-20 rounded-md border border-slate-200 object-cover object-top"
      onError={() => setFailed(true)}
    />
  );
}

function fmtCreated(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

function statusLabel(status: string) {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return { text: 'Active', cls: 'text-emerald-700' };
  if (s === 'INACTIVE') return { text: 'Inactive', cls: 'text-amber-700' };
  return { text: status, cls: 'text-slate-600' };
}

export function ThemeListPage() {
  const navigate = useNavigate();
  const { themes, themesLoading, themesError, reloadThemes } = useThemes();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sort, setSort] = useState<'name_asc' | 'created_desc'>('name_asc');
  const [page, setPage] = useState(1);

  const typeOptions = useMemo(() => {
    const s = new Set(themes.map((t) => t.themeType).filter(Boolean));
    return [...s].sort();
  }, [themes]);

  const filtered = useMemo(() => {
    let rows = [...themes];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.themeName.toLowerCase().includes(q) ||
          r.themeType.toLowerCase().includes(q),
      );
    }
    if (typeFilter) rows = rows.filter((r) => r.themeType === typeFilter);
    if (sort === 'name_asc') rows.sort((a, b) => a.themeName.localeCompare(b.themeName));
    else rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return rows;
  }, [themes, search, typeFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const lbl =
    'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';

  return (
    <div>
      <ResourcePanel
        title="Theme catalog"
        toolbar={
          <Link to="/themes/upload" className={adminBtnPrimary}>
            Upload theme
          </Link>
        }
      >
        {themesError ? (
          <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {themesError}{' '}
            <button
              type="button"
              className="font-medium text-amber-950 underline"
              onClick={() => void reloadThemes()}
            >
              Retry
            </button>
          </p>
        ) : null}
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-3 py-2">
          <div className="min-w-[8rem] flex-1">
            <label className={lbl}>Search</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, id, type…"
              className="w-full rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className={lbl}>Storefront type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="">All</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="name_asc">Name A–Z</option>
              <option value="created_desc">Newest</option>
            </select>
          </div>
          <button
            type="button"
            className={adminBtnSecondary}
            onClick={() => {
              setSearch('');
              setTypeFilter('');
              setSort('name_asc');
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
        <DataTable
          columns={[
            {
              id: 'preview',
              header: 'Preview',
              cell: (r) => <ThemeThumbnail src={r.previewImage} name={r.themeName} />,
            },
            {
              id: 'id',
              header: 'Theme ID',
              cell: (r) => (
                <code className="text-[10px]" title={r.id}>
                  {r.id.slice(0, 8)}…
                </code>
              ),
            },
            { id: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.themeName}</span> },
            {
              id: 'ch',
              header: 'Channel',
              cell: (r) => (
                <span className="text-xs font-medium text-slate-700">{r.themeChannel ?? 'WEB'}</span>
              ),
            },
            { id: 'type', header: 'Family', cell: (r) => <span className="text-xs">{r.themeType}</span> },
            {
              id: 'slug',
              header: 'Slug',
              cell: (r) => <code className="text-[10px] text-slate-600">{r.slug ?? '—'}</code>,
            },
            {
              id: 'demo',
              header: 'Demo / preview',
              cell: (r) => {
                const host = readDemoHost(r.themeConfigJson);
                if (!host) return <span className="text-xs text-slate-400">—</span>;
                const href = demoHostToUrl(host);
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-indigo-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open demo
                  </a>
                );
              },
            },
            {
              id: 'status',
              header: 'Status',
              cell: (r) => {
                const st = statusLabel(r.status);
                return <span className={`text-xs font-medium ${st.cls}`}>{st.text}</span>;
              },
            },
            { id: 'created', header: 'Created', cell: (r) => <span className="text-xs">{fmtCreated(r.createdAt)}</span> },
            {
              id: 'act',
              header: 'Actions',
              className: 'min-w-[8rem] whitespace-normal',
              cell: (r) => (
                <div
                  className="flex flex-wrap gap-x-2 gap-y-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link className="font-medium text-indigo-600 hover:underline" to={`/themes/${r.id}/preview`}>
                    Preview
                  </Link>
                  <Link className="font-medium text-indigo-600 hover:underline" to={`/themes/${r.id}/edit`}>
                    Details
                  </Link>
                </div>
              ),
            },
          ]}
          rows={pageRows}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/themes/${r.id}/edit`)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
          {themesLoading ? (
            <span>Loading themes…</span>
          ) : (
            <span>
              {filtered.length === 0
                ? 'No themes (check API or migrations).'
                : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={adminBtnSecondary}
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, Math.max(1, p) + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </ResourcePanel>
    </div>
  );
}
