import { apiGet } from "@/lib/apiClient";

export type PublicIndustry = {
  industryId: string;
  displayOrder: number;
  name: string;
  description: string;
  icon: string;
  createdAt: string;
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

function normalizeIndustry(row: unknown): PublicIndustry | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const industryId = String(r.industryId ?? r.industry_id ?? "").trim();
  const name = String(r.name ?? "").trim();
  if (!industryId || !name) return null;
  return {
    industryId,
    displayOrder: Number(r.displayOrder ?? r.display_order ?? 0) || 0,
    name,
    description: String(r.description ?? "").trim(),
    icon: String(r.icon ?? "Box").trim() || "Box",
    createdAt: String(r.createdAt ?? r.created_at ?? "").trim(),
  };
}

/** Active industries — uses authenticated api client (Bearer on onboarding) with public fallback semantics. */
export async function fetchPublicIndustries(): Promise<PublicIndustry[]> {
  const data = await apiGet<unknown>("/industries", { skipAuth: true });
  const out: PublicIndustry[] = [];
  for (const row of unwrapArray(data)) {
    const i = normalizeIndustry(row);
    if (i) out.push(i);
  }
  out.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  return out;
}
