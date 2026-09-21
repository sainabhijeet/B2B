/** Persists chosen ISO alpha-2 after login (onboarding shows this country only). */
export const DISTRIBUTOR_COUNTRY_ISO_KEY = "distributor_panel_country_iso";

/** UUID from `countries` row — preferred so onboarding does not need the full list to resolve country. */
export const DISTRIBUTOR_COUNTRY_ID_KEY = "distributor_panel_country_id";

/** Display name at login time (fallback label before `/countries` row is loaded). */
export const DISTRIBUTOR_COUNTRY_NAME_KEY = "distributor_panel_country_name";

export function getDistributorLoginCountryId(): string | null {
  try {
    const v = localStorage.getItem(DISTRIBUTOR_COUNTRY_ID_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function getDistributorLoginCountryIso(): string | null {
  try {
    const v = localStorage.getItem(DISTRIBUTOR_COUNTRY_ISO_KEY);
    return v && v.trim() ? v.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function getDistributorLoginCountryName(): string | null {
  try {
    const v = localStorage.getItem(DISTRIBUTOR_COUNTRY_NAME_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

/** National + dial display saved at OTP verify (same as login screen). */
export const DISTRIBUTOR_LOGIN_PHONE_KEY = "distributor_panel_login_phone";

export function getDistributorLoginPhone(): string | null {
  try {
    const v = localStorage.getItem(DISTRIBUTOR_LOGIN_PHONE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}
