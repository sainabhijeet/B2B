import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiGet } from '@/lib/apiClient';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useLocationMaster } from '@/components/locations/LocationContext';
import type { CountryRow, GeoStatus } from '@/lib/locationDemoData';
import { DEFAULT_LANGUAGE_OPTIONS } from '@/lib/locationDemoData';
import { mapCountryApiToRow, type CountryApiRow } from '@/lib/countryApi';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

type Mode = 'create' | 'edit';

export function CountryFormPage({ mode }: { mode: Mode }) {
  const { countryId } = useParams();
  const navigate = useNavigate();
  const { countries, countriesLoading, addCountry, updateCountry } = useLocationMaster();
  const [loadedRow, setLoadedRow] = useState<CountryRow | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const existing =
    mode === 'edit' && countryId
      ? (countries.find((c) => c.countryId === countryId) ?? loadedRow ?? undefined)
      : undefined;

  useEffect(() => {
    if (mode !== 'edit' || !countryId) {
      setLoadedRow(null);
      setLoadError(null);
      return;
    }
    if (countries.find((c) => c.countryId === countryId)) {
      setLoadedRow(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setFetchingOne(true);
    setLoadError(null);
    void apiGet<CountryApiRow>(`/admin/countries/${countryId}`)
      .then((row) => {
        if (!cancelled) setLoadedRow(mapCountryApiToRow(row));
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedRow(null);
          setLoadError('Country not found or failed to load.');
        }
      })
      .finally(() => {
        if (!cancelled) setFetchingOne(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, countryId, countries]);

  const [name, setName] = useState('');
  const [isoCode, setIsoCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [currency, setCurrency] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [status, setStatus] = useState<GeoStatus>('active');
  const [timezone, setTimezone] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [taxSystem, setTaxSystem] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setName(existing.name);
      setIsoCode(existing.isoCode);
      setPhoneCode(existing.phoneCode);
      setCurrency(existing.currency);
      setDefaultLanguage(existing.defaultLanguage);
      setStatus(existing.status);
      setTimezone(existing.timezone ?? '');
      setCurrencySymbol(existing.currencySymbol ?? '');
      setTaxSystem(existing.taxSystem ?? '');
    }
    if (mode === 'create') {
      setName('');
      setIsoCode('');
      setPhoneCode('+');
      setCurrency('');
      setDefaultLanguage('en');
      setStatus('active');
      setTimezone('');
      setCurrencySymbol('');
      setTaxSystem('');
    }
  }, [mode, existing, countryId]);

  if (mode === 'edit' && countryId && !existing && (countriesLoading || fetchingOne)) {
    return (
      <ResourcePanel title="Edit country">
        <p className="p-3 text-xs text-slate-600">Loading…</p>
      </ResourcePanel>
    );
  }

  if (mode === 'edit' && countryId && !existing && !countriesLoading && !fetchingOne) {
    return (
      <ResourcePanel title="Edit country">
        <p className="p-3 text-xs text-slate-600">{loadError ?? 'Country not found.'}</p>
        <Link to="/locations/countries" className={`${adminBtnSecondary} m-3 inline-block`}>
          Back to list
        </Link>
      </ResourcePanel>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload: Omit<CountryRow, 'countryId' | 'createdAt'> = {
      name: name.trim(),
      isoCode: isoCode.trim().toUpperCase(),
      phoneCode: phoneCode.trim(),
      currency: currency.trim().toUpperCase(),
      defaultLanguage,
      status,
      timezone: timezone.trim() || null,
      currencySymbol: currencySymbol.trim() || null,
      taxSystem: taxSystem.trim() || null,
    };
    setSaving(true);
    try {
      if (mode === 'create') {
        await addCountry(payload);
        window.alert('Country saved.');
      } else if (mode === 'edit' && countryId) {
        await updateCountry(countryId, payload);
        window.alert('Country updated.');
      }
      navigate('/locations/countries');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Save failed';
      window.alert(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResourcePanel title={mode === 'create' ? 'Add country' : `Edit — ${existing?.name ?? ''}`}>
      <form className="max-w-lg space-y-4 p-3" onSubmit={onSubmit}>
        <div>
          <label className={setLbl}>Country name</label>
          <input className={setInp} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className={setLbl}>ISO code</label>
          <div className="flex items-center gap-2">
            <input
              className={`${setInp} max-w-[6rem]`}
              value={isoCode}
              onChange={(e) => setIsoCode(e.target.value)}
              maxLength={2}
              placeholder="IN"
              required
            />
            {isoCode.trim().length === 2 ? (
              <CountryFlag isoCode={isoCode} className="text-2xl leading-none" title={isoCode.trim().toUpperCase()} />
            ) : null}
          </div>
        </div>
        <div>
          <label className={setLbl}>Phone code</label>
          <input
            className={setInp}
            value={phoneCode}
            onChange={(e) => setPhoneCode(e.target.value)}
            placeholder="+91"
            required
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Shown when user picks country — combine with national number for E.164 (e.g. +919876543210).
          </p>
        </div>
        <div>
          <label className={setLbl}>Currency (ISO)</label>
          <input className={setInp} value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="INR" required />
        </div>
        <div>
          <label className={setLbl}>Default language</label>
          <select className={setInp} value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)}>
            {DEFAULT_LANGUAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={setLbl}>Status</label>
          <select className={setInp} value={status} onChange={(e) => setStatus(e.target.value as GeoStatus)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="rounded-sm border border-slate-200 bg-slate-50/80 p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase text-slate-500">Optional (future-ready)</div>
          <div className="space-y-3">
            <div>
              <label className={setLbl}>Timezone (IANA)</label>
              <input
                className={setInp}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Kolkata"
              />
            </div>
            <div>
              <label className={setLbl}>Currency symbol</label>
              <input
                className={setInp}
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="₹"
              />
            </div>
            <div>
              <label className={setLbl}>Tax system label</label>
              <input
                className={setInp}
                value={taxSystem}
                onChange={(e) => setTaxSystem(e.target.value)}
                placeholder="GST"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={adminBtnPrimary} disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Save country' : 'Save changes'}
          </button>
          <Link to="/locations/countries" className={adminBtnSecondary}>
            Cancel
          </Link>
        </div>
      </form>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Store users with <span className="font-mono">country_code</span> (+91) + <span className="font-mono">phone_number</span>{' '}
        (digits only); derive E.164 in the API.
      </p>
    </ResourcePanel>
  );
}
