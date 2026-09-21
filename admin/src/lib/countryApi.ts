import type { CountryRow, GeoStatus } from '@/lib/locationDemoData';

export type CountryApiRow = {
  countryId: string;
  name: string;
  isoCode: string;
  phoneCode: string;
  currency: string;
  defaultLanguage: string;
  status: string;
  timezone: string | null;
  currencySymbol: string | null;
  taxSystem: string | null;
  createdAt: string;
  updatedAt: string;
};

export function mapCountryApiToRow(c: CountryApiRow): CountryRow {
  const st = c.status === 'inactive' ? 'inactive' : 'active';
  return {
    countryId: c.countryId,
    name: c.name,
    isoCode: c.isoCode,
    phoneCode: c.phoneCode,
    currency: c.currency,
    defaultLanguage: c.defaultLanguage,
    status: st as GeoStatus,
    createdAt: c.createdAt,
    timezone: c.timezone,
    currencySymbol: c.currencySymbol,
    taxSystem: c.taxSystem,
  };
}

export function countryRowToCreateBody(input: Omit<CountryRow, 'countryId' | 'createdAt'>) {
  return {
    name: input.name,
    isoCode: input.isoCode,
    phoneCode: input.phoneCode,
    currency: input.currency,
    defaultLanguage: input.defaultLanguage,
    status: input.status,
    timezone: input.timezone,
    currencySymbol: input.currencySymbol,
    taxSystem: input.taxSystem,
  };
}
