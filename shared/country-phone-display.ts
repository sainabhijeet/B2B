import { isoCodeToFlagEmoji } from "./iso-country-flag";

export type PublicCountryRow = {
  countryId: string;
  name: string;
  isoCode: string;
  phoneCode: string;
  /** From DB; both null ⇒ use platform limits (same as auth DTO). */
  phoneNationalMin: number | null;
  phoneNationalMax: number | null;
};

/** Matches backend `SendOtpDto` / `VerifyOtpSessionDto` national phone when country has no lengths. */
export const PLATFORM_NATIONAL_PHONE_LEN_MIN = 5;
export const PLATFORM_NATIONAL_PHONE_LEN_MAX = 14;

function parseOptionalInt(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

/** Effective min/max national digit count for UI + Send OTP, clamped to platform limits. */
export function nationalDigitsBounds(row: PublicCountryRow): { min: number; max: number } {
  let min = row.phoneNationalMin;
  let max = row.phoneNationalMax;
  if (min == null || min < 1) min = PLATFORM_NATIONAL_PHONE_LEN_MIN;
  if (max == null || max < 1) max = PLATFORM_NATIONAL_PHONE_LEN_MAX;
  min = Math.round(min);
  max = Math.round(max);
  if (min > max) [min, max] = [max, min];
  min = Math.max(
    PLATFORM_NATIONAL_PHONE_LEN_MIN,
    Math.min(min, PLATFORM_NATIONAL_PHONE_LEN_MAX),
  );
  max = Math.max(
    PLATFORM_NATIONAL_PHONE_LEN_MIN,
    Math.min(max, PLATFORM_NATIONAL_PHONE_LEN_MAX),
  );
  if (min > max) {
    return {
      min: PLATFORM_NATIONAL_PHONE_LEN_MIN,
      max: PLATFORM_NATIONAL_PHONE_LEN_MAX,
    };
  }
  return { min, max };
}

/** Normalise dial string from DB/API only (adds leading + when digits present). */
export function formatDialFromApi(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (t.startsWith("+")) {
    const rest = t.slice(1).replace(/\D/g, "");
    return rest ? `+${rest}` : "";
  }
  const digits = t.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

export function countryFlagEmoji(iso2: string): string {
  return isoCodeToFlagEmoji(iso2);
}

function looksLikeCountryRow(o: object): boolean {
  const r = o as Record<string, unknown>;
  return Boolean(
    r.countryId ??
      r.country_id ??
      r.isoCode ??
      r.iso_code ??
      r.phoneCode ??
      r.phone_code ??
      r.dialCode ??
      r.dial_code,
  );
}

function findCountryRowsArray(payload: unknown, depth = 0): unknown[] | null {
  if (depth > 10 || payload == null) return null;
  if (typeof payload === "string") {
    const t = payload.trim();
    if (!t.startsWith("{") && !t.startsWith("[")) return null;
    try {
      return findCountryRowsArray(JSON.parse(t) as unknown, depth + 1);
    } catch {
      return null;
    }
  }
  if (Array.isArray(payload)) {
    if (payload.length === 0) return null;
    const sample = payload.find((x) => x && typeof x === "object");
    if (sample && looksLikeCountryRow(sample as object)) {
      return payload;
    }
    return null;
  }
  if (typeof payload === "object") {
    for (const v of Object.values(payload as Record<string, unknown>)) {
      const hit = findCountryRowsArray(v, depth + 1);
      if (hit && hit.length > 0) return hit;
    }
  }
  return null;
}

/** One row from GET /countries — values only from payload (camelCase or snake_case keys). */
export function normalizeCountryApiRow(row: unknown): PublicCountryRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const countryId = String(
    r.countryId ?? r.country_id ?? r.id ?? r.uuid ?? r.countryUuid ?? "",
  ).trim();
  const name = String(r.name ?? r.countryName ?? r.country_name ?? r.title ?? "").trim();
  let isoCode = String(
    r.isoCode ?? r.iso_code ?? r.iso2 ?? r.countryCode ?? r.country_code ?? "",
  )
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (isoCode.length > 2) isoCode = isoCode.slice(0, 2);

  const phoneCode = formatDialFromApi(
    String(
      r.phoneCode ??
        r.phone_code ??
        r.dialCode ??
        r.dial_code ??
        r.callingCode ??
        r.calling_code ??
        r.internationalPrefix ??
        r.international_prefix ??
        "",
    ),
  );

  if (!countryId || !name || isoCode.length !== 2) return null;

  const phoneNationalMin = parseOptionalInt(
    r.phoneNationalMin ?? r.phone_national_min ?? r.phoneNational_min,
  );
  const phoneNationalMax = parseOptionalInt(
    r.phoneNationalMax ?? r.phone_national_max ?? r.phoneNational_max,
  );

  return { countryId, name, isoCode, phoneCode, phoneNationalMin, phoneNationalMax };
}

/**
 * Parses GET /countries JSON. Supports a top-level array (Nest default) or nested `{ data: [...] }` etc.
 * No invented country data — only rows the API returns and `normalizeCountryApiRow` accepts.
 */
export function parseCountriesListResponse(payload: unknown): PublicCountryRow[] {
  let root: unknown = payload;
  if (typeof root === "string") {
    try {
      root = JSON.parse(root) as unknown;
    } catch {
      return [];
    }
  }

  let arr: unknown[] | null = null;
  if (Array.isArray(root)) {
    arr = root;
  } else {
    arr = findCountryRowsArray(root);
  }

  if (!arr?.length) return [];
  const out: PublicCountryRow[] = [];
  for (const item of arr) {
    const c = normalizeCountryApiRow(item);
    if (c) out.push(c);
  }
  return out;
}
