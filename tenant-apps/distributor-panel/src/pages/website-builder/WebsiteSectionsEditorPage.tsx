import { useEffect, useMemo, useState } from "react";
import { useAllowedSectionKeysSet } from "@/hooks/useAllowedSections";
import { ApiError } from "@/lib/apiClient";
import {
  fetchTenantContent,
  fetchWebsiteBuilderTemplate,
  fetchWebsiteBuilderThemeInfo,
  formatWebsiteBuilderError,
  saveTenantContent,
  type WebsiteSectionOverride,
  uploadTenantMedia,
} from "@/lib/websiteBuilderApi";

type Props = {
  pageKey: "home" | "category" | "product";
};

type SettingType = "text" | "number" | "boolean" | "image";
type SettingField = { key: string; type: SettingType; value: string; label?: string; placeholder?: string };

const SECTION_OPTIONS: Record<Props["pageKey"], Array<{ key: string; label: string }>> = {
  home: [
    { key: "header", label: "Header" },
    { key: "hero-banner", label: "Hero Banner" },
    { key: "collection-grid", label: "Category Grid" },
    { key: "product-grid", label: "Product Grid" },
    { key: "testimonial", label: "Testimonial" },
    { key: "newsletter", label: "Newsletter" },
    { key: "blog-grid", label: "Editorial Banner" },
    { key: "footer", label: "Footer" },
  ],
  category: [
    { key: "header", label: "Header" },
    { key: "category-banner", label: "Category Banner" },
    { key: "product-grid", label: "Product Grid" },
    { key: "footer", label: "Footer" },
  ],
  product: [
    { key: "header", label: "Header" },
    { key: "product-detail", label: "Product Detail" },
    { key: "related-products", label: "Related Products" },
    { key: "footer", label: "Footer" },
  ],
};

function guessType(value: unknown, key = ""): SettingType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (
    typeof value === "string" &&
    (/(?:image|background|thumbnail|logo|icon|src|url|path)/iu.test(key) ||
      value.includes("/images/") ||
      value.startsWith("http"))
  ) return "image";
  return "text";
}

function settingsToFields(settings: Record<string, unknown>): SettingField[] {
  const fields: SettingField[] = [];
  const visit = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}.${index}`));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([key, child]) =>
        visit(child, path ? `${path}.${key}` : key),
      );
      return;
    }
    fields.push({ key: path, type: guessType(value, path), value: String(value ?? "") });
  };
  Object.entries(settings).forEach(([key, value]) => visit(value, key));
  return fields;
}

function fieldsToSettings(fields: SettingField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const setPath = (path: string, value: unknown) => {
    const parts = path.split(".").map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return;
    let cursor: Record<string, unknown> | unknown[] = out;
    parts.forEach((part, index) => {
      const last = index === parts.length - 1;
      if (last) {
        (cursor as Record<string, unknown>)[part] = value;
        return;
      }
      const nextIsIndex = /^\d+$/u.test(parts[index + 1]);
      const current = (cursor as Record<string, unknown>)[part];
      if (!current || typeof current !== "object") {
        (cursor as Record<string, unknown>)[part] = nextIsIndex ? [] : {};
      }
      cursor = (cursor as Record<string, unknown>)[part] as Record<string, unknown> | unknown[];
    });
  };
  for (const f of fields) {
    const key = f.key.trim();
    if (!key) continue;
    if (f.type === "number") {
      const n = Number(f.value);
      setPath(key, Number.isFinite(n) ? n : 0);
      continue;
    }
    if (f.type === "boolean") {
      setPath(key, f.value === "true");
      continue;
    }
    setPath(key, f.value);
  }
  return out;
}

function templateSections(input: unknown): WebsiteSectionOverride[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) return [];
  const sections = (input as Record<string, unknown>).sections;
  if (!Array.isArray(sections)) return [];
  return sections.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const section = raw as Record<string, unknown>;
    const sectionKey = String(section.id ?? section.type ?? section.component ?? "").trim();
    if (!sectionKey) return [];
    const settings =
      section.settings && typeof section.settings === "object" && !Array.isArray(section.settings)
        ? (section.settings as Record<string, unknown>)
        : {};
    return [{ sectionKey, settings, orderIndex: index, enabled: true }];
  });
}

export function WebsiteSectionsEditorPage({ pageKey }: Props) {
  const allowSet = useAllowedSectionKeysSet();
  const [themeRows, setThemeRows] = useState<WebsiteSectionOverride[]>([]);
  const sectionOptions = useMemo(() => {
    const dynamic = themeRows.map((row) => ({ key: row.sectionKey, label: row.sectionKey }));
    const all = dynamic.length ? dynamic : SECTION_OPTIONS[pageKey];
    if (!allowSet) return all;
    const filtered = all.filter((o) => allowSet.has(o.key.trim().toLowerCase()));
    return filtered.length ? filtered : all;
  }, [pageKey, allowSet, themeRows]);

  const [rows, setRows] = useState<WebsiteSectionOverride[]>([]);
  const [fieldsMap, setFieldsMap] = useState<Record<number, SettingField[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMessage(null);
    void Promise.all([fetchTenantContent(pageKey), fetchWebsiteBuilderThemeInfo()])
      .then(async ([sections, themeInfo]) => {
        const template = await fetchWebsiteBuilderTemplate(themeInfo, pageKey);
        const fromTheme = templateSections(template);
        setThemeRows(fromTheme);
        const hydrated = sections.length ? sections : fromTheme;
        setRows(hydrated);
        const next: Record<number, SettingField[]> = {};
        hydrated.forEach((s, idx) => {
          next[idx] = settingsToFields(s.settings);
        });
        setFieldsMap(next);
      })
      .catch((e) => {
        setRows([]);
        setThemeRows([]);
        setError(formatWebsiteBuilderError(e, "Could not load section overrides."));
      })
      .finally(() => setLoading(false));
  }, [pageKey]);

  const canSave = useMemo(() => rows.length > 0 && !saving, [rows.length, saving]);

  function updateRow(index: number, patch: Partial<WebsiteSectionOverride>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const defaultSectionKey =
      sectionOptions[0]?.key ?? SECTION_OPTIONS[pageKey][0]?.key ?? "new-section";
    setRows((prev) => [
      ...prev,
      { sectionKey: defaultSectionKey, settings: {}, orderIndex: prev.length, enabled: true },
    ]);
    setFieldsMap((prev) => ({
      ...prev,
      [rows.length]: settingsToFields(
        themeRows.find((item) => item.sectionKey === defaultSectionKey)?.settings ?? {},
      ),
    }));
  }

  async function onSave() {
    setError(null);
    setMessage(null);
    const compiled: WebsiteSectionOverride[] = [];
    for (let i = 0; i < rows.length; i++) {
      const parsed = fieldsToSettings(fieldsMap[i] ?? []);
      compiled.push({ ...rows[i], settings: parsed, orderIndex: i });
    }

    setSaving(true);
    try {
      const saved = await saveTenantContent(pageKey, compiled);
      setRows(saved);
      const next: Record<number, SettingField[]> = {};
      saved.forEach((s, idx) => {
        next[idx] = settingsToFields(s.settings);
      });
      setFieldsMap(next);
      setMessage("Saved successfully.");
      window.dispatchEvent(new CustomEvent("website-builder:preview-refresh"));
    } catch (e) {
      setError(formatWebsiteBuilderError(e, "Could not save section overrides."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {pageKey} sections
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Add section
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void onSave()}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <p className="text-xs text-slate-500">
        Fields selected theme ke template se load hote hain. Nested text aur image fields dot-path ke saath editable hain.
      </p>

      {rows.map((row, idx) => {
        const pickerOptions = sectionOptions.some((o) => o.key === row.sectionKey)
          ? sectionOptions
          : [
              ...sectionOptions,
              { key: row.sectionKey, label: `${row.sectionKey} (not in theme allow-list)` },
            ];
        return (
        <div key={`${row.sectionKey}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-medium text-slate-700">
              Section key
              <select
                value={row.sectionKey}
                onChange={(e) => {
                  const nextKey = e.target.value;
                  updateRow(idx, { sectionKey: nextKey });
                  setFieldsMap((prev) => {
                    const hasValues = (prev[idx] ?? []).some((f) => f.value.trim() !== "" || f.key.trim() !== "");
                    if (hasValues) return prev;
                    return {
                      ...prev,
                      [idx]: settingsToFields(
                        themeRows.find((item) => item.sectionKey === nextKey)?.settings ?? {},
                      ),
                    };
                  });
                }}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
              >
                {pickerOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">
              Enabled
              <select
                value={row.enabled ? "true" : "false"}
                onChange={(e) => updateRow(idx, { enabled: e.target.value === "true" })}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">
              Order
              <input
                type="number"
                value={row.orderIndex}
                onChange={(e) => updateRow(idx, { orderIndex: Number(e.target.value) || 0 })}
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-700">Settings</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFieldsMap((prev) => ({
                      ...prev,
                      [idx]: settingsToFields(
                        themeRows.find((item) => item.sectionKey === row.sectionKey)?.settings ?? {},
                      ),
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset from theme
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFieldsMap((prev) => ({
                      ...prev,
                      [idx]: [...(prev[idx] ?? []), { key: "", type: "text", value: "" }],
                    }))
                  }
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Add field
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {(fieldsMap[idx] ?? []).map((field, fIdx) => (
                <div key={`${idx}-${fIdx}`} className="grid gap-2 md:grid-cols-12">
                  <input
                    value={field.key}
                    onChange={(e) =>
                      setFieldsMap((prev) => ({
                        ...prev,
                        [idx]: (prev[idx] ?? []).map((x, i) => (i === fIdx ? { ...x, key: e.target.value } : x)),
                      }))
                    }
                    placeholder={field.label ? `${field.label} key` : "key (e.g. title)"}
                    className="md:col-span-4 h-9 rounded-md border border-slate-300 px-2 text-sm"
                  />
                  <select
                    value={field.type}
                    onChange={(e) =>
                      setFieldsMap((prev) => ({
                        ...prev,
                        [idx]: (prev[idx] ?? []).map((x, i) =>
                          i === fIdx ? { ...x, type: e.target.value as SettingType } : x,
                        ),
                      }))
                    }
                    className="md:col-span-2 h-9 rounded-md border border-slate-300 px-2 text-sm"
                  >
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="image">image</option>
                  </select>
                  {field.type === "boolean" ? (
                    <select
                      value={field.value === "true" ? "true" : "false"}
                      onChange={(e) =>
                        setFieldsMap((prev) => ({
                          ...prev,
                          [idx]: (prev[idx] ?? []).map((x, i) => (i === fIdx ? { ...x, value: e.target.value } : x)),
                        }))
                      }
                      className="md:col-span-5 h-9 rounded-md border border-slate-300 px-2 text-sm"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      value={field.value}
                      onChange={(e) =>
                        setFieldsMap((prev) => ({
                          ...prev,
                          [idx]: (prev[idx] ?? []).map((x, i) => (i === fIdx ? { ...x, value: e.target.value } : x)),
                        }))
                      }
                      placeholder={
                        field.placeholder ??
                        (field.type === "image" ? "https://... or /storage/..." : "value")
                      }
                      className="md:col-span-5 h-9 rounded-md border border-slate-300 px-2 text-sm"
                    />
                  )}
                  {field.type === "image" ? (
                    <label className="md:col-span-12 inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                      {uploadingField === `${idx}-${fIdx}` ? "Uploading..." : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingField === `${idx}-${fIdx}`}
                        onChange={(e) => {
                          const selected = e.target.files?.[0];
                          if (!selected) return;
                          const key = `${idx}-${fIdx}`;
                          setUploadingField(key);
                          setError(null);
                          void uploadTenantMedia(selected)
                            .then((url) => {
                              setFieldsMap((prev) => ({
                                ...prev,
                                [idx]: (prev[idx] ?? []).map((x, i) => (i === fIdx ? { ...x, value: url } : x)),
                              }));
                            })
                            .catch((uploadErr) => {
                              setError(uploadErr instanceof ApiError ? uploadErr.message : "Image upload failed.");
                            })
                            .finally(() => {
                              setUploadingField(null);
                              e.target.value = "";
                            });
                        }}
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      setFieldsMap((prev) => ({
                        ...prev,
                        [idx]: (prev[idx] ?? []).filter((_, i) => i !== fIdx),
                      }))
                    }
                    className="md:col-span-1 h-9 rounded-md border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}
