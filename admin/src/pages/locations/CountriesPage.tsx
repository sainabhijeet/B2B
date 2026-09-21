import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useLocationMaster, type CountryRow } from '@/components/locations/LocationContext';
import { languageLabel } from '@/lib/locationDemoData';
import { ApiError, apiGet } from '@/lib/apiClient';
import { getApiOrigin } from '@/lib/apiBase';
import { mapCountryApiToRow, type CountryApiRow } from '@/lib/countryApi';
import type { PaginatedOf } from '@/lib/locationMasterApi';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

function statusClass(s: CountryRow['status']) {
  return s === 'active' ? 'text-emerald-700' : 'text-slate-500';
}

const LIMIT_OPTIONS = [25, 50, 100] as const;

export function CountriesPage() {
  const { countriesError, reloadCountries } = useLocationMaster();
  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(25);
  const [rows, setRows] = useState<CountryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (searchApplied.trim()) q.set('search', searchApplied.trim());
      const data = await apiGet<PaginatedOf<CountryApiRow>>(`/admin/countries?${q.toString()}`);
      const items = Array.isArray(data?.items) ? data.items : [];
      setRows(items.map(mapCountryApiToRow));
      setTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load countries';
      setError(`${msg} — API: ${getApiOrigin()}`);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchApplied]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <ResourcePanel
      title="Countries"
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/locations/countries/new" className={adminBtnPrimary}>
            Add country
          </Link>
          {countriesError || error ? (
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() => {
                void reloadCountries();
                void load();
              }}
            >
              Retry load
            </button>
          ) : null}
        </div>
      }
    >
      {countriesError ? (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          Country picker cache: {countriesError}. Other location tabs use the same API origin.
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-3 py-2">
        <div className="min-w-[8rem]">
          <label className={setLbl}>Rows per page</label>
          <select
            className={setInp}
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className={setLbl}>Search (name, ISO, phone code)</label>
          <input
            className={setInp}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <button
          type="button"
          className={adminBtnSecondary}
          onClick={() => {
            setSearchApplied(searchDraft);
            setPage(1);
          }}
        >
          Apply search
        </button>
      </div>
      {error ? (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">Loading countries…</p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="border-b border-sky-100 bg-sky-50 px-3 py-2 text-[11px] text-sky-900">
          No countries match. From <span className="font-mono">backend/</span> run{' '}
          <span className="font-mono">npm run countries:seed</span> then Retry load.
        </p>
      ) : null}
      <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
        Server-side pagination on <span className="font-mono">countries</span>. States / cities / pincodes load
        step-by-step from their tabs (no bulk master fetch).
      </p>
      {rows.length > 0 ? (
        <>
          <DataTable
            columns={[
              {
                id: 'n',
                header: 'Country',
                cell: (r: CountryRow) => (
                  <span className="flex items-center gap-2">
                    <CountryFlag isoCode={r.isoCode} className="text-lg leading-none" />
                    <span className="font-medium">{r.name}</span>
                  </span>
                ),
              },
              { id: 'iso', header: 'ISO', cell: (r: CountryRow) => <code className="text-xs">{r.isoCode}</code> },
              { id: 'ph', header: 'Phone code', cell: (r: CountryRow) => <code className="text-xs">{r.phoneCode}</code> },
              { id: 'cur', header: 'Currency', cell: (r: CountryRow) => r.currency },
              {
                id: 'lang',
                header: 'Default language',
                cell: (r: CountryRow) => <span className="text-xs">{languageLabel(r.defaultLanguage)}</span>,
              },
              {
                id: 'tz',
                header: 'Timezone',
                cell: (r: CountryRow) =>
                  r.timezone ? (
                    <code className="text-[10px] text-slate-600">{r.timezone}</code>
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                id: 'st',
                header: 'Status',
                cell: (r: CountryRow) => (
                  <span className={`text-xs font-medium capitalize ${statusClass(r.status)}`}>{r.status}</span>
                ),
              },
              {
                id: 'act',
                header: '',
                className: 'w-px whitespace-nowrap',
                cell: (r: CountryRow) => (
                  <Link
                    to={`/locations/countries/${r.countryId}/edit`}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </Link>
                ),
              },
            ]}
            rows={rows}
            rowKey={(r) => r.countryId}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-600">
            <span>
              {total} countr{total === 1 ? 'y' : 'ies'} · page {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                className={adminBtnSecondary}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className={adminBtnSecondary}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Example E.164: India <span className="font-mono">+91</span> + <span className="font-mono">9876543210</span> →{' '}
        <span className="font-mono">+919876543210</span>
      </p>
    </ResourcePanel>
  );
}
