import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useLocationMaster } from '@/components/locations/LocationContext';
import type { CityRow } from '@/lib/locationDemoData';
import { ApiError, apiGet } from '@/lib/apiClient';
import { getApiOrigin } from '@/lib/apiBase';
import { isoCodeToFlagEmoji } from '@/lib/isoCountryFlag';
import { mapCityApiToRow, type PaginatedOf, type CityAdminApiRow, type StateAdminApiRow } from '@/lib/locationMasterApi';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

type CityTableRow = CityRow & { stateName: string; countryName: string; countryId: string };

function statusClass(s: CityRow['status']) {
  return s === 'active' ? 'text-emerald-700' : 'text-slate-500';
}

const LIMIT_OPTIONS = [25, 50, 100] as const;

async function loadAllStatesForCountry(countryId: string): Promise<StateAdminApiRow[]> {
  const out: StateAdminApiRow[] = [];
  let page = 1;
  const pageSize = 100;
  while (true) {
    const d = await apiGet<PaginatedOf<StateAdminApiRow>>(
      `/admin/locations/states?countryId=${encodeURIComponent(countryId)}&page=${page}&limit=${pageSize}`,
    );
    const items = d.items ?? [];
    out.push(...items);
    if (items.length < pageSize || out.length >= (d.total ?? 0)) break;
    page += 1;
  }
  return out;
}

export function CitiesPage() {
  const { countries, countriesLoading, countriesError, reloadCountries } = useLocationMaster();
  const [countryId, setCountryId] = useState('');
  const [stateId, setStateId] = useState('');
  const [stateOptions, setStateOptions] = useState<StateAdminApiRow[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(25);
  const [rows, setRows] = useState<CityTableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countriesSorted = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries],
  );

  useEffect(() => {
    if (!countryId) {
      setStateOptions([]);
      setStateId('');
      return;
    }
    let cancelled = false;
    setStatesLoading(true);
    void loadAllStatesForCountry(countryId)
      .then((list) => {
        if (!cancelled) {
          setStateOptions(list.sort((a, b) => a.name.localeCompare(b.name)));
          setStateId('');
        }
      })
      .catch(() => {
        if (!cancelled) setStateOptions([]);
      })
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  const load = useCallback(async () => {
    if (!stateId) {
      setRows([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        stateId,
        page: String(page),
        limit: String(limit),
      });
      if (searchApplied.trim()) q.set('search', searchApplied.trim());
      const data = await apiGet<PaginatedOf<CityAdminApiRow>>(`/admin/locations/cities?${q.toString()}`);
      const items = Array.isArray(data?.items) ? data.items : [];
      setRows(
        items.map((c) => ({
          ...mapCityApiToRow(c),
          stateName: c.stateName,
          countryName: c.countryName,
          countryId: c.countryId,
        })),
      );
      setTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load cities';
      setError(`${msg} — API: ${getApiOrigin()}`);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [stateId, page, limit, searchApplied]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <ResourcePanel title="Cities">
      {countriesError ? (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          Countries: {countriesError}{' '}
          <button type="button" className="font-medium text-indigo-700 underline" onClick={() => void reloadCountries()}>
            Retry
          </button>
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-3 py-2">
        <div className="min-w-[10rem]">
          <label className={setLbl}>Country</label>
          <select
            className={setInp}
            disabled={countriesLoading}
            value={countryId}
            onChange={(e) => {
              setCountryId(e.target.value);
              setStateId('');
              setPage(1);
            }}
          >
            <option value="">Select country…</option>
            {countriesSorted.map((c) => {
              const f = isoCodeToFlagEmoji(c.isoCode);
              return (
                <option key={c.countryId} value={c.countryId}>
                  {f ? `${f} ` : ''}
                  {c.name} ({c.isoCode})
                </option>
              );
            })}
          </select>
        </div>
        <div className="min-w-[10rem]">
          <label className={setLbl}>State</label>
          <select
            className={setInp}
            disabled={!countryId || statesLoading}
            value={stateId}
            onChange={(e) => {
              setStateId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{countryId ? (statesLoading ? 'Loading states…' : 'Select state…') : '—'}</option>
            {stateOptions.map((s) => (
              <option key={s.stateId} value={s.stateId}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
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
          <label className={setLbl}>Search city name</label>
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
          {error}{' '}
          <button type="button" className="font-medium text-indigo-700 underline" onClick={() => void load()}>
            Retry
          </button>
        </p>
      ) : null}
      {loading ? (
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-500">Loading…</p>
      ) : null}
      <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
        Flow: country → state → paginated cities from <span className="font-mono">geo_cities</span>. Large countries: use
        search to narrow city names.
      </p>
      {!stateId && !loading ? (
        <p className="px-3 py-6 text-center text-xs text-slate-500">Select country and state to load cities.</p>
      ) : null}
      {stateId && !loading && !error && rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-slate-500">No cities for this filter.</p>
      ) : null}
      {stateId && rows.length > 0 ? (
        <>
          <DataTable
            columns={[
              {
                id: 'n',
                header: 'City name',
                cell: (r: CityTableRow) => <span className="font-medium">{r.name}</span>,
              },
              { id: 'st', header: 'State', cell: (r) => r.stateName },
              {
                id: 'co',
                header: 'Country',
                cell: (r: CityTableRow) => {
                  const iso = countries.find((co) => co.countryId === r.countryId)?.isoCode ?? '';
                  return (
                    <span className="flex items-center gap-1.5">
                      {iso ? <CountryFlag isoCode={iso} className="text-base leading-none" /> : null}
                      <span>{r.countryName}</span>
                    </span>
                  );
                },
              },
              {
                id: 'status',
                header: 'Status',
                cell: (r) => (
                  <span className={`text-xs font-medium capitalize ${statusClass(r.status)}`}>{r.status}</span>
                ),
              },
            ]}
            rows={rows}
            rowKey={(r) => r.cityId}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-600">
            <span>
              {total} cit{total === 1 ? 'y' : 'ies'} · page {page} / {totalPages}
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
    </ResourcePanel>
  );
}
