import { apiGet } from "@/lib/apiClient";

export type PublicStateRow = {
  stateId: string;
  countryId: string;
  name: string;
  code: string;
};

export type PublicCityRow = {
  cityId: string;
  stateId: string;
  name: string;
};

function unwrapArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.items)) return o.items;
  }
  return [];
}

function normalizeState(row: unknown): PublicStateRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const stateId = String(r.stateId ?? r.state_id ?? "").trim();
  const countryId = String(r.countryId ?? r.country_id ?? "").trim();
  const name = String(r.name ?? "").trim();
  if (!stateId || !name) return null;
  return {
    stateId,
    countryId,
    name,
    code: String(r.code ?? r.state_code ?? "").trim(),
  };
}

function normalizeCity(row: unknown): PublicCityRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const cityId = String(r.cityId ?? r.city_id ?? "").trim();
  const stateId = String(r.stateId ?? r.state_id ?? "").trim();
  const name = String(r.name ?? "").trim();
  if (!cityId || !name) return null;
  return { cityId, stateId, name };
}

export async function fetchStatesPublic(countryId: string): Promise<PublicStateRow[]> {
  const data = await apiGet<unknown>(
    `/locations/states?countryId=${encodeURIComponent(countryId)}`,
    { skipAuth: true },
  );
  const out: PublicStateRow[] = [];
  for (const row of unwrapArray(data)) {
    const s = normalizeState(row);
    if (s) out.push(s);
  }
  return out;
}

export async function fetchCitiesPublic(stateId: string): Promise<PublicCityRow[]> {
  const data = await apiGet<unknown>(`/locations/cities?stateId=${encodeURIComponent(stateId)}`, {
    skipAuth: true,
  });
  const out: PublicCityRow[] = [];
  for (const row of unwrapArray(data)) {
    const c = normalizeCity(row);
    if (c) out.push(c);
  }
  return out;
}
