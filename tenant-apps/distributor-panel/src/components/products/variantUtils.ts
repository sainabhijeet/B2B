export type AttrDef = { name: string; values: string[] };

/** Parses "a, b ,c" into trimmed non-empty tokens. */
export function parseCommaValues(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Cartesian combinations of attribute values (each attribute name → one value). */
export function attributeCombinations(attrs: AttrDef[]): Record<string, string>[] {
  const cleaned = attrs
    .map((a) => ({
      name: a.name.trim(),
      values: a.values.map((v) => v.trim()).filter(Boolean),
    }))
    .filter((a) => a.name && a.values.length > 0);
  if (!cleaned.length) return [];

  function recur(i: number): Record<string, string>[] {
    if (i >= cleaned.length) return [{}];
    const { name, values } = cleaned[i];
    const tail = recur(i + 1);
    const out: Record<string, string>[] = [];
    for (const v of values) {
      for (const t of tail) {
        out.push({ [name]: v, ...t });
      }
    }
    return out;
  }
  return recur(0);
}

export function comboLabel(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}
