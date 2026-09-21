import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { CountryRow, GeoStatus } from '@/lib/locationDemoData';
import { ApiError, apiGet, apiPatch, apiPost } from '@/lib/apiClient';
import { getApiOrigin } from '@/lib/apiBase';
import { countryRowToCreateBody, mapCountryApiToRow, type CountryApiRow } from '@/lib/countryApi';
import type { PaginatedOf } from '@/lib/locationMasterApi';

type LocationContextValue = {
  countries: CountryRow[];
  countriesLoading: boolean;
  countriesError: string | null;
  reloadCountries: () => Promise<void>;
  setCountries: Dispatch<SetStateAction<CountryRow[]>>;
  countryName: (id: string) => string;
  addCountry: (input: Omit<CountryRow, 'countryId' | 'createdAt'>) => Promise<string>;
  updateCountry: (countryId: string, payload: Omit<CountryRow, 'countryId' | 'createdAt'>) => Promise<void>;
};

const LocationContext = createContext<LocationContextValue | null>(null);

/** Must stay ≤ backend `@Max(100)` on `GET /admin/countries`. */
const COUNTRIES_PAGE_SIZE = 100;

async function fetchAllAdminCountries(): Promise<CountryRow[]> {
  const out: CountryRow[] = [];
  let page = 1;
  while (true) {
    const data = await apiGet<PaginatedOf<CountryApiRow>>(
      `/admin/countries?page=${page}&limit=${COUNTRIES_PAGE_SIZE}`,
    );
    const items = Array.isArray(data?.items) ? data.items : [];
    out.push(...items.map(mapCountryApiToRow));
    if (items.length < COUNTRIES_PAGE_SIZE || page * COUNTRIES_PAGE_SIZE >= (data.total ?? 0)) break;
    page += 1;
  }
  return out;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [countriesError, setCountriesError] = useState<string | null>(null);

  const reloadCountries = useCallback(async () => {
    setCountriesLoading(true);
    setCountriesError(null);
    try {
      const rows = await fetchAllAdminCountries();
      setCountries(rows);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed';
      setCountriesError(`${msg} — API: ${getApiOrigin()}`);
      setCountries([]);
    } finally {
      setCountriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadCountries();
  }, [reloadCountries]);

  const countryName = useCallback(
    (id: string) => countries.find((c) => c.countryId === id)?.name ?? id,
    [countries],
  );

  const addCountry = useCallback(async (input: Omit<CountryRow, 'countryId' | 'createdAt'>) => {
    const created = await apiPost<CountryApiRow>('/admin/countries', countryRowToCreateBody(input));
    const row = mapCountryApiToRow(created);
    setCountries((list) => [row, ...list]);
    return row.countryId;
  }, []);

  const updateCountry = useCallback(async (countryId: string, payload: Omit<CountryRow, 'countryId' | 'createdAt'>) => {
    const updated = await apiPatch<CountryApiRow>(
      `/admin/countries/${countryId}`,
      countryRowToCreateBody(payload),
    );
    const row = mapCountryApiToRow(updated);
    setCountries((list) => {
      const i = list.findIndex((c) => c.countryId === countryId);
      if (i >= 0) return list.map((c) => (c.countryId === countryId ? row : c));
      return [row, ...list];
    });
  }, []);

  const value = useMemo(
    () => ({
      countries,
      countriesLoading,
      countriesError,
      reloadCountries,
      setCountries,
      countryName,
      addCountry,
      updateCountry,
    }),
    [countries, countriesLoading, countriesError, reloadCountries, countryName, addCountry, updateCountry],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationMaster(): LocationContextValue {
  const c = useContext(LocationContext);
  if (!c) throw new Error('useLocationMaster must be used inside LocationProvider');
  return c;
}

export type { CountryRow, GeoStatus };
