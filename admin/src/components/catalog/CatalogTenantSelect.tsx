import { useEffect, useState } from 'react';
import { fetchTenants, type TenantFromApi } from '@/lib/tenantsApi';

export function CatalogTenantSelect(props: {
  value: string;
  onChange: (value: string) => void;
  allowGlobal?: boolean;
  disabled?: boolean;
}) {
  const [tenants, setTenants] = useState<TenantFromApi[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetchTenants()
      .then((rows) => active && setTenants(rows.filter((row) => row.status === 'active')))
      .catch(() => active && setError(true));
    return () => { active = false; };
  }, []);

  return (
    <label className="block min-w-[15rem] text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      Catalog scope
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="mt-0.5 w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs font-normal normal-case text-slate-900"
      >
        {!props.allowGlobal ? <option value="">Select tenant/app…</option> : null}
        {props.allowGlobal ? <option value="global">Global master catalog</option> : null}
        {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.slug}</option>)}
      </select>
      {error ? <span className="mt-1 block normal-case text-red-600">Could not load tenants.</span> : null}
    </label>
  );
}
