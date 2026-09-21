import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import {
  ATTRIBUTE_ROWS,
  ATTRIBUTE_TYPES,
  type AttributeStatus,
  type AttributeType,
  typeLabel,
} from '@/lib/attributeDemoData';
import { listAttributesWithMappings, type CatalogAttributeApiRow } from '@/lib/attributesApi';

const PAGE_SIZE = 5;

type ListRow = {
  id: string;
  name: string;
  slug: string;
  typeKey: string;
  industriesLabel: string;
  categoriesLabel: string;
  status: AttributeStatus;
  createdAt: string;
  sortOrder: number;
};

function statusClass(s: AttributeStatus) {
  const m: Record<AttributeStatus, string> = {
    active: 'text-emerald-700',
    inactive: 'text-amber-700',
    archived: 'text-slate-500',
  };
  return m[s];
}

function toAttributeStatus(s: string): AttributeStatus {
  if (s === 'active' || s === 'inactive' || s === 'archived') return s;
  return 'active';
}

function typeDisplay(typeKey: string): string {
  if ((ATTRIBUTE_TYPES as readonly string[]).includes(typeKey)) {
    return typeLabel(typeKey as AttributeType);
  }
  return typeKey.replace(/_/g, ' ');
}

function mapDemoRows(): ListRow[] {
  return ATTRIBUTE_ROWS.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.id,
    typeKey: r.type,
    industriesLabel: r.industry,
    categoriesLabel: r.categoryIds.length ? r.categoryIds.join(', ') : '—',
    status: r.status,
    createdAt: r.createdAt,
    sortOrder: r.sortOrder,
  }));
}

function mapApiRows(rows: CatalogAttributeApiRow[]): ListRow[] {
  return rows.map((a, idx) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    typeKey: a.dataType,
    industriesLabel: a.catalogIndustries?.length ? a.catalogIndustries.join(', ') : '—',
    categoriesLabel: a.catalogCategories?.length ? a.catalogCategories.join(', ') : '—',
    status: toAttributeStatus(a.status),
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : '—',
    sortOrder: idx,
  }));
}

export function AttributeListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ListRow[]>(() => mapDemoRows());
  const [dataSource, setDataSource] = useState<'api' | 'demo'>('demo');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sort, setSort] = useState<'sort_asc' | 'name_asc' | 'created_desc'>('sort_asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const apiRows = await listAttributesWithMappings();
        if (cancelled) return;
        if (apiRows.length) {
          setRows(mapApiRows(apiRows));
          setDataSource('api');
        } else {
          setRows(mapDemoRows());
          setDataSource('demo');
        }
      } catch {
        if (cancelled) return;
        setRows(mapDemoRows());
        setDataSource('demo');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.industriesLabel.toLowerCase().includes(q) ||
          r.categoriesLabel.toLowerCase().includes(q),
      );
    }
    if (typeFilter) list = list.filter((r) => r.typeKey === typeFilter);

    if (sort === 'sort_asc') {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    } else if (sort === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return list;
  }, [rows, search, typeFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const lbl =
    'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';

  return (
    <div>
      <PageHeader
        title="Attributes"
        description="Global catalog attributes — types, values, category & industry mapping."
        actions={
          <Link to="/attributes/new" className={adminBtnPrimary}>
            Add attribute
          </Link>
        }
      />
      {dataSource === 'demo' ? (
        <p className="mb-2 rounded-sm border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Showing sample rows until the catalog API returns data (check auth / migrations).
        </p>
      ) : null}
      <ResourcePanel>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-3 py-2">
          <div className="min-w-[8rem] flex-1">
            <label className={lbl}>Search</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, slug, ID, industries…"
              className="w-full rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className={lbl}>Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs capitalize"
            >
              <option value="">All types</option>
              {ATTRIBUTE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
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
              <option value="sort_asc">Sort order</option>
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
              setSort('sort_asc');
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
        <DataTable
          columns={[
            {
              id: 'id',
              header: 'Attribute ID',
              cell: (r) => <code className="text-xs">{r.id}</code>,
            },
            { id: 'name', header: 'Name', cell: (r) => r.name },
            { id: 'slug', header: 'Slug', cell: (r) => <code className="text-xs">{r.slug}</code> },
            {
              id: 'type',
              header: 'Type',
              cell: (r) => typeDisplay(r.typeKey),
            },
            {
              id: 'industries',
              header: 'Industries',
              className: 'max-w-[12rem] truncate',
              cell: (r) => <span title={r.industriesLabel}>{r.industriesLabel}</span>,
            },
            {
              id: 'categories',
              header: 'Categories',
              className: 'max-w-[12rem] truncate',
              cell: (r) => <span title={r.categoriesLabel}>{r.categoriesLabel}</span>,
            },
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
              className: 'min-w-[11rem] whitespace-normal',
              cell: (r: ListRow) => (
                <div
                  className="flex max-w-[14rem] flex-wrap gap-x-2 gap-y-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    className="font-medium text-indigo-600 hover:underline"
                    to={`/attributes/${r.id}/edit`}
                  >
                    Edit
                  </Link>
                  <button type="button" className="font-medium text-slate-700 hover:underline">
                    Disable
                  </button>
                  <button type="button" className="font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                  <Link
                    className="font-medium text-indigo-600 hover:underline"
                    to={`/attributes/${r.id}/edit?tab=values`}
                  >
                    View values
                  </Link>
                </div>
              ),
            },
          ]}
          rows={pageRows}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/attributes/${r.id}/edit`)}
        />
        <PaginationFooter
          filteredLength={filtered.length}
          safePage={safePage}
          totalPages={totalPages}
          setPage={setPage}
        />
      </ResourcePanel>
      <p className="mt-2 text-xs text-slate-500">
        DB: <code className="text-xs">attributes</code>, <code className="text-xs">attribute_values</code>,{' '}
        <code className="text-xs">attribute_industries</code>, <code className="text-xs">attribute_categories</code>.
      </p>
    </div>
  );
}

function PaginationFooter(props: {
  filteredLength: number;
  safePage: number;
  totalPages: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  const { filteredLength, safePage, totalPages, setPage } = props;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
      <span>
        {filteredLength === 0
          ? 'No results'
          : `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredLength)} of ${filteredLength}`}
      </span>
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
  );
}
