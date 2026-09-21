/** Demo — maps to countries, states, cities, pincodes (master geographic data). */

export type GeoStatus = 'active' | 'inactive';

export type CountryRow = {
  countryId: string;
  name: string;
  isoCode: string;
  /** E.g. +91 — used for distributor signup, OTP, SMS E.164 prefix */
  phoneCode: string;
  currency: string;
  /** BCP-47 style or short code stored; UI shows label */
  defaultLanguage: string;
  status: GeoStatus;
  createdAt: string;
  /** Optional master fields for tax, display, scheduling */
  timezone: string | null;
  currencySymbol: string | null;
  taxSystem: string | null;
};

export type StateRow = {
  stateId: string;
  countryId: string;
  name: string;
  code: string;
  status: GeoStatus;
};

export type CityRow = {
  cityId: string;
  stateId: string;
  name: string;
  status: GeoStatus;
};

export type PincodeRow = {
  pincodeId: string;
  code: string;
  cityId: string;
  status: GeoStatus;
};

/** Default language options for country form (extend with translations catalog later). */
export const DEFAULT_LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
  { value: 'es', label: 'Spanish' },
];

export function languageLabel(code: string): string {
  return DEFAULT_LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code;
}

export const INITIAL_COUNTRIES: CountryRow[] = [
  {
    countryId: 'ct-in',
    name: 'India',
    isoCode: 'IN',
    phoneCode: '+91',
    currency: 'INR',
    defaultLanguage: 'hi',
    status: 'active',
    createdAt: '2026-01-01T08:00:00+05:30',
    timezone: 'Asia/Kolkata',
    currencySymbol: '₹',
    taxSystem: 'GST',
  },
  {
    countryId: 'ct-fr',
    name: 'France',
    isoCode: 'FR',
    phoneCode: '+33',
    currency: 'EUR',
    defaultLanguage: 'fr',
    status: 'active',
    createdAt: '2026-01-01T08:00:00+05:30',
    timezone: 'Europe/Paris',
    currencySymbol: '€',
    taxSystem: 'VAT',
  },
  {
    countryId: 'ct-us',
    name: 'United States',
    isoCode: 'US',
    phoneCode: '+1',
    currency: 'USD',
    defaultLanguage: 'en',
    status: 'active',
    createdAt: '2026-01-01T08:00:00+05:30',
    timezone: 'America/New_York',
    currencySymbol: '$',
    taxSystem: 'Sales tax (state)',
  },
  {
    countryId: 'ct-ae',
    name: 'United Arab Emirates',
    isoCode: 'AE',
    phoneCode: '+971',
    currency: 'AED',
    defaultLanguage: 'ar',
    status: 'active',
    createdAt: '2026-01-01T08:00:00+05:30',
    timezone: 'Asia/Dubai',
    currencySymbol: 'د.إ',
    taxSystem: 'VAT',
  },
  {
    countryId: 'ct-gb',
    name: 'United Kingdom',
    isoCode: 'GB',
    phoneCode: '+44',
    currency: 'GBP',
    defaultLanguage: 'en',
    status: 'active',
    createdAt: '2026-01-01T08:00:00+05:30',
    timezone: 'Europe/London',
    currencySymbol: '£',
    taxSystem: 'VAT',
  },
];

export const INITIAL_STATES: StateRow[] = [
  { stateId: 'st-rj', countryId: 'ct-in', name: 'Rajasthan', code: 'RJ', status: 'active' },
  { stateId: 'st-gj', countryId: 'ct-in', name: 'Gujarat', code: 'GJ', status: 'active' },
  { stateId: 'st-mh', countryId: 'ct-in', name: 'Maharashtra', code: 'MH', status: 'active' },
  { stateId: 'st-tn', countryId: 'ct-in', name: 'Tamil Nadu', code: 'TN', status: 'active' },
];

export const INITIAL_CITIES: CityRow[] = [
  { cityId: 'cy-jpr', stateId: 'st-rj', name: 'Jaipur', status: 'active' },
  { cityId: 'cy-ahm', stateId: 'st-gj', name: 'Ahmedabad', status: 'active' },
  { cityId: 'cy-mum', stateId: 'st-mh', name: 'Mumbai', status: 'active' },
  { cityId: 'cy-che', stateId: 'st-tn', name: 'Chennai', status: 'active' },
];

export const INITIAL_PINCODES: PincodeRow[] = [
  { pincodeId: 'pc-1', code: '302013', cityId: 'cy-jpr', status: 'active' },
  { pincodeId: 'pc-2', code: '380001', cityId: 'cy-ahm', status: 'active' },
  { pincodeId: 'pc-3', code: '400001', cityId: 'cy-mum', status: 'active' },
  { pincodeId: 'pc-4', code: '600001', cityId: 'cy-che', status: 'active' },
];

/** Extra rows merged when user clicks “Import India sample” */
export const INDIA_SAMPLE_IMPORT = {
  states: [
    { stateId: 'st-up', countryId: 'ct-in', name: 'Uttar Pradesh', code: 'UP', status: 'active' as const },
    { stateId: 'st-ka', countryId: 'ct-in', name: 'Karnataka', code: 'KA', status: 'active' as const },
    { stateId: 'st-wb', countryId: 'ct-in', name: 'West Bengal', code: 'WB', status: 'active' as const },
  ],
  cities: [
    { cityId: 'cy-del', stateId: 'st-up', name: 'Noida', status: 'active' as const },
    { cityId: 'cy-blr', stateId: 'st-ka', name: 'Bengaluru', status: 'active' as const },
    { cityId: 'cy-kol', stateId: 'st-wb', name: 'Kolkata', status: 'active' as const },
  ],
  pincodes: [
    { pincodeId: 'pc-5', code: '201301', cityId: 'cy-del', status: 'active' as const },
    { pincodeId: 'pc-6', code: '560001', cityId: 'cy-blr', status: 'active' as const },
    { pincodeId: 'pc-7', code: '700001', cityId: 'cy-kol', status: 'active' as const },
  ],
};
