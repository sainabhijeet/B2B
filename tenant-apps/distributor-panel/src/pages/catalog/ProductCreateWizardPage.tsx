import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  PenLine,
  Zap,
  ChevronRight,
  ImagePlus,
} from "lucide-react";
import {
  createProduct,
  createVariant,
  fetchProduct,
  updateVariant,
  upsertInventory,
} from "@/api/productsApi";
import { createTenantBrand, fetchBrandOptions, type MergedBrandOption } from "@/api/brandsApi";
import { fetchAttributeValues, fetchAttributesAll, mapWithConcurrency } from "@/api/attributesApi";
import { fetchCategoriesAll } from "@/api/categoriesApi";
import { fetchPublicIndustries, type PublicIndustry } from "@/lib/industriesPublic";
import { attributeCombinations, comboLabel, parseCommaValues, type AttrDef } from "@/components/products/variantUtils";
import { ApiError } from "@/lib/apiClient";
import type { CategoryRow } from "@/types/category";
import type { CreateProductBody } from "@/types/product";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourcePanel } from "@/components/ui/ResourcePanel";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";

const btnPrimary =
  "inline-flex items-center justify-center gap-1 rounded-sm bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700";
const btnSecondary =
  "inline-flex items-center justify-center gap-1 rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50";

const lbl = "mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500";
const inp =
  "w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900";

type EntryMode = "pick" | "manual" | "quick";

const STEPS = [
  { id: 1, label: "Basic info" },
  { id: 2, label: "Category" },
  { id: 3, label: "Attributes" },
  { id: 4, label: "Variants" },
  { id: 5, label: "Images" },
  { id: 6, label: "Pricing" },
  { id: 7, label: "Inventory & B2B" },
  { id: 8, label: "SEO" },
] as const;

type VariantRow = {
  id: string;
  label: string;
  sku: string;
  price: string;
  stock: string;
  attributesJson: Record<string, string>;
};

type AttrCatalogEntry = { id: string; name: string; slug: string; values: string[] };

type AttrSelectionRow = { key: string; attributeId: string; valuesCsv: string };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}`;
}

function buildAttrDefsFromSelections(
  sel: AttrSelectionRow[],
  catalog: Pick<AttrCatalogEntry, "id" | "name">[],
): AttrDef[] {
  return sel
    .filter((r) => r.attributeId && r.valuesCsv.trim())
    .map((r) => {
      const name = catalog.find((a) => a.id === r.attributeId)?.name?.trim() ?? "";
      return { name, values: parseCommaValues(r.valuesCsv) };
    })
    .filter((d) => d.name && d.values.length);
}

function buildVariantRowsFromAttrDefs(defs: AttrDef[], skuBase: string, defaultPrice: string): VariantRow[] {
  const combos = attributeCombinations(defs);
  if (!combos.length) {
    return [
      {
        id: randomId(),
        label: "Default",
        sku: `${skuBase}-DEF`.slice(0, 48),
        price: defaultPrice || "0",
        stock: "0",
        attributesJson: {},
      },
    ];
  }
  return combos.map((combo, i) => ({
    id: randomId(),
    label: comboLabel(combo) || `Variant ${i + 1}`,
    sku: `${skuBase}-${slugify(Object.values(combo).join("-")).toUpperCase()}`.slice(0, 48),
    price: defaultPrice || "999",
    stock: String(10 + (i % 5)),
    attributesJson: combo,
  }));
}

function buildBrandFieldOptions(brands: MergedBrandOption[]) {
  const masters = brands.filter((b) => b.type === "master");
  const mine = brands.filter((b) => b.type === "tenant");
  const opts: { value: string; label: string; disabled?: boolean }[] = [{ value: "", label: "— No catalog brand —" }];
  if (masters.length) {
    opts.push({ value: "__ph_m__", label: "Platform brands", disabled: true });
    for (const b of masters) opts.push({ value: `m:${b.id}`, label: b.name });
  }
  if (mine.length) {
    opts.push({ value: "__ph_t__", label: "My brands", disabled: true });
    for (const b of mine) opts.push({ value: `t:${b.id}`, label: b.name });
  }
  opts.push({ value: "__text__", label: "Other (typed name only)" });
  return opts;
}

function brandPayloadFromSelect(
  brandSelectValue: string,
  brandOtherText: string,
): Pick<CreateProductBody, "brand" | "brandId" | "brandMasterId"> {
  if (brandSelectValue.startsWith("m:")) return { brandMasterId: brandSelectValue.slice(2) };
  if (brandSelectValue.startsWith("t:")) return { brandId: brandSelectValue.slice(2) };
  if (brandSelectValue === "__text__") {
    const t = brandOtherText.trim();
    return t ? { brand: t } : {};
  }
  return {};
}

export function ProductCreateWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [entry, setEntry] = useState<EntryMode>("pick");
  const [step, setStep] = useState(1);

  const [industries, setIndustries] = useState<PublicIndustry[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brandOptions, setBrandOptions] = useState<MergedBrandOption[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [brandSelectValue, setBrandSelectValue] = useState("");
  const [brandOtherText, setBrandOtherText] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [description, setDescription] = useState("");

  const [categoryIndustryFilter, setCategoryIndustryFilter] = useState("");
  const [categoryPrimary, setCategoryPrimary] = useState("");
  const [categorySub, setCategorySub] = useState("");

  const [attrCatalog, setAttrCatalog] = useState<AttrCatalogEntry[]>([]);
  const [attrSelections, setAttrSelections] = useState<AttrSelectionRow[]>([]);

  const [variants, setVariants] = useState<VariantRow[]>([]);

  const [mrp, setMrp] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");

  const [warehouse, setWarehouse] = useState("Default");
  const [stock, setStock] = useState("100");
  const [reserved, setReserved] = useState("0");

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [tags, setTags] = useState("");

  const [quickName, setQuickName] = useState("");
  const [quickSlug, setQuickSlug] = useState("");
  const [quickCategoryId, setQuickCategoryId] = useState("");
  const [quickIndustryId, setQuickIndustryId] = useState("");
  const [quickBrandSelect, setQuickBrandSelect] = useState("");
  const [quickBrandOther, setQuickBrandOther] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickStock, setQuickStock] = useState("");

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDescription, setNewBrandDescription] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);

  const baseSku = useMemo(
    () => slugify(name || quickName || "SKU").toUpperCase().slice(0, 8) || "ITEM",
    [name, quickName],
  );

  const industryName = (id: string) => industries.find((i) => i.industryId === id)?.name?.trim() ?? "";

  const rootCategories = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId);
    if (!categoryIndustryFilter) return roots.sort((a, b) => a.name.localeCompare(b.name));
    return roots
      .filter((c) => !c.industryId || c.industryId === categoryIndustryFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, categoryIndustryFilter]);

  const subCategories = useMemo(() => {
    if (!categoryPrimary) return [];
    return categories
      .filter((c) => c.parentId === categoryPrimary)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, categoryPrimary]);

  const flatCategoryOptions = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId);
    const out: { value: string; label: string }[] = [];
    for (const r of roots.sort((a, b) => a.name.localeCompare(b.name))) {
      if (quickIndustryId && r.industryId && r.industryId !== quickIndustryId) continue;
      if (quickIndustryId && !r.industryId) {
        /* keep globals */
      }
      out.push({ value: r.id, label: r.name });
      for (const ch of categories
        .filter((c) => c.parentId === r.id)
        .sort((a, b) => a.name.localeCompare(b.name))) {
        out.push({ value: ch.id, label: `${r.name} › ${ch.name}` });
      }
    }
    return out;
  }, [categories, quickIndustryId]);

  const manualBrandFieldOptions = useMemo(() => buildBrandFieldOptions(brandOptions), [brandOptions]);
  const quickBrandFieldOptions = useMemo(() => buildBrandFieldOptions(brandOptions), [brandOptions]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchPublicIndustries().catch(() => [] as PublicIndustry[]),
      fetchCategoriesAll(),
      fetchBrandOptions().catch(() => ({ data: [] as MergedBrandOption[] })),
    ])
      .then(([ind, cats, brRes]) => {
        if (cancelled) return;
        setIndustries(ind);
        setCategories(cats);
        setBrandOptions(brRes.data ?? []);
        setCatalogError(null);
      })
      .catch(() => {
        if (!cancelled) setCatalogError("Could not load catalog lists (industries / categories / brands).");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchAttributesAll()
      .then(async (rows) => {
        const attrs = rows.filter((a) => a.status === "active");
        const entries = await mapWithConcurrency(attrs, 6, async (a) => {
          try {
            const vr = await fetchAttributeValues(a.id);
            const values = (vr.data ?? [])
              .filter((v) => v.status === "active")
              .map((v) => v.value.trim())
              .filter(Boolean);
            return { id: a.id, name: a.name, slug: a.slug, values };
          } catch {
            return { id: a.id, name: a.name, slug: a.slug, values: [] as string[] };
          }
        });
        if (cancelled) return;
        entries.sort((x, y) => x.name.localeCompare(y.name));
        setAttrCatalog(entries);
      })
      .catch(() => {
        if (!cancelled) setAttrCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!categoryPrimary) return;
    const stillValid = rootCategories.some((c) => c.id === categoryPrimary);
    if (!stillValid) {
      setCategoryPrimary("");
      setCategorySub("");
    }
  }, [rootCategories, categoryPrimary]);

  useEffect(() => {
    if (!categorySub) return;
    const ok = subCategories.some((c) => c.id === categorySub);
    if (!ok) setCategorySub("");
  }, [subCategories, categorySub]);

  useEffect(() => {
    if (!attrCatalog.length || attrSelections.length > 0) return;
    setAttrSelections([{ key: randomId(), attributeId: "", valuesCsv: "" }]);
  }, [attrCatalog, attrSelections.length]);

  function updateSelectionRow(key: string, patch: Partial<AttrSelectionRow>) {
    setAttrSelections((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onAttributePicked(key: string, attributeId: string) {
    const cat = attrCatalog.find((a) => a.id === attributeId);
    const csv = cat?.values?.length ? cat.values.join(", ") : "";
    updateSelectionRow(key, { attributeId, valuesCsv: csv });
  }

  function regenerateVariants() {
    const defs = buildAttrDefsFromSelections(attrSelections, attrCatalog);
    setVariants(buildVariantRowsFromAttrDefs(defs, baseSku, price.trim() || "999"));
  }

  function updateVariantRow(id: string, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function persistProduct(kind: "draft" | "publish") {
    setSaveError(null);
    const nm = name.trim();
    if (!nm) {
      setSaveError("Product name is required.");
      return;
    }
    const slugVal = slug.trim() || slugify(nm);
    if (!slugVal) {
      setSaveError("Slug is required.");
      return;
    }
    const catId = categorySub || categoryPrimary;
    if (!catId) {
      setSaveError("Select a primary category (and sub-category if available).");
      return;
    }
    const priceStr = (price.trim() || "0").trim();
    const mrpStr = (mrp.trim() || priceStr).trim();
    const defs = buildAttrDefsFromSelections(attrSelections, attrCatalog);
    const rows = variants.length ? variants : buildVariantRowsFromAttrDefs(defs, baseSku, priceStr);
    const sku0 = rows[0]?.sku?.trim();
    if (!sku0) {
      setSaveError("First variant SKU is required.");
      return;
    }
    const tax = "0";
    const tagArr = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const brandExtra = brandPayloadFromSelect(brandSelectValue, brandOtherText);

    setSaving(true);
    try {
      const body: CreateProductBody = {
        name: nm,
        slug: slugVal,
        sku: sku0,
        description: (description.trim() || "—").trim(),
        categoryId: catId,
        price: priceStr,
        mrp: mrpStr,
        taxRate: tax,
        status: kind === "publish" ? "active" : "draft",
        ...brandExtra,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDesc.trim() || undefined,
        metaKeywords: tagArr.length ? tagArr.join(", ") : undefined,
        costPrice: cost.trim() || undefined,
        tags: tagArr.length ? tagArr : undefined,
      };

      const created = await createProduct(body);
      const pid = created.data.id;

      function attrsForVariant(v: VariantRow): Record<string, string> {
        return v.attributesJson && Object.keys(v.attributesJson).length ? { ...v.attributesJson } : {};
      }

      const detail = await fetchProduct(pid);
      const existing = detail.data.variants;

      if (existing.length === 0) {
        for (const v of rows) {
          const stockQty = Math.max(0, Math.floor(Number(v.stock) || 0));
          const vr = await createVariant(pid, {
            variantSku: v.sku.trim(),
            price: (v.price || priceStr).trim(),
            mrp: mrpStr,
            stockQuantity: stockQty,
            attributesJson: attrsForVariant(v) as Record<string, unknown>,
            status: "active",
          });
          await upsertInventory({
            productId: pid,
            variantId: vr.data.id,
            stockQuantity: stockQty,
            lowStockThreshold: 0,
          });
        }
      } else {
        const firstServer = existing[0];
        await updateVariant(pid, firstServer.id, {
          variantSku: rows[0].sku.trim(),
          price: (rows[0].price || priceStr).trim(),
          mrp: mrpStr,
          stockQuantity: Math.max(0, Math.floor(Number(rows[0].stock) || 0)),
          attributesJson: attrsForVariant(rows[0]) as Record<string, unknown>,
          status: "active",
        });
        await upsertInventory({
          productId: pid,
          variantId: firstServer.id,
          stockQuantity: Math.max(0, Math.floor(Number(rows[0].stock) || 0)),
          lowStockThreshold: 0,
        });
        for (let i = 1; i < rows.length; i += 1) {
          const v = rows[i];
          const stockQty = Math.max(0, Math.floor(Number(v.stock) || 0));
          const vr = await createVariant(pid, {
            variantSku: v.sku.trim(),
            price: (v.price || priceStr).trim(),
            mrp: mrpStr,
            stockQuantity: stockQty,
            attributesJson: attrsForVariant(v) as Record<string, unknown>,
            status: "active",
          });
          await upsertInventory({
            productId: pid,
            variantId: vr.data.id,
            stockQuantity: stockQty,
            lowStockThreshold: 0,
          });
        }
      }

      void reserved;
      void warehouse;

      void queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate(`/catalog/products/${pid}`);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function quickSave() {
    setSaveError(null);
    const nm = quickName.trim();
    if (!nm) {
      setSaveError("Product name is required.");
      return;
    }
    if (!quickCategoryId) {
      setSaveError("Select a category.");
      return;
    }
    const slugVal = quickSlug.trim() || slugify(nm);
    const sku0 = `${slugify(nm).toUpperCase().slice(0, 12) || "SKU"}-001`.slice(0, 120);
    const priceStr = (quickPrice.trim() || "0").trim();
    const stockQty = Math.max(0, Math.floor(Number(quickStock) || 0));
    const brandExtra = brandPayloadFromSelect(quickBrandSelect, quickBrandOther);
    const indTag = quickIndustryId ? industryName(quickIndustryId) : "";
    const tagsQuick = [slugify(nm), indTag].filter(Boolean);

    setSaving(true);
    try {
      const created = await createProduct({
        name: nm,
        slug: slugVal,
        sku: sku0,
        description: "—",
        categoryId: quickCategoryId,
        price: priceStr,
        mrp: priceStr,
        taxRate: "0",
        status: "draft",
        ...brandExtra,
        tags: tagsQuick.length ? tagsQuick : undefined,
      });
      const pid = created.data.id;
      const detail = await fetchProduct(pid);
      const existing = detail.data.variants;
      if (existing.length === 0) {
        const vr = await createVariant(pid, {
          variantSku: sku0,
          price: priceStr,
          mrp: priceStr,
          stockQuantity: stockQty,
          attributesJson: {},
          status: "active",
        });
        await upsertInventory({
          productId: pid,
          variantId: vr.data.id,
          stockQuantity: stockQty,
          lowStockThreshold: 0,
        });
      } else {
        await updateVariant(pid, existing[0].id, {
          variantSku: sku0,
          price: priceStr,
          mrp: priceStr,
          stockQuantity: stockQty,
          attributesJson: {},
          status: "active",
        });
        await upsertInventory({
          productId: pid,
          variantId: existing[0].id,
          stockQuantity: stockQty,
          lowStockThreshold: 0,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate(`/catalog/products/${pid}`);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (entry === "pick") {
    return (
      <div>
        <PageHeader
          title="Add product"
          description="Use the full catalog wizard or create a basic product quickly."
          actions={
            <Link to="/catalog/products" className={btnSecondary}>
              ← Product list
            </Link>
          }
        />

        <div className="mx-auto max-w-3xl space-y-4">
          {catalogError ? <p className="text-center text-xs text-amber-800">{catalogError}</p> : null}
          <ResourcePanel title="How do you want to add this product?">
            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setEntry("manual");
                  setStep(1);
                }}
                className="flex flex-col items-start rounded-sm border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <PenLine className="mb-2 h-5 w-5 text-slate-600" />
                <div className="text-xs font-semibold text-slate-900">Manual add</div>
                <p className="mt-1 text-[11px] leading-snug text-slate-600">
                  Step-by-step wizard — full control.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setEntry("quick")}
                className="flex flex-col items-start rounded-sm border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <Zap className="mb-2 h-5 w-5 text-emerald-600" />
                <div className="text-xs font-semibold text-slate-900">Quick add</div>
                <p className="mt-1 text-[11px] leading-snug text-slate-600">
                  Name + price + stock → default variant in one save.
                </p>
              </button>
            </div>
          </ResourcePanel>
          <p className="mx-auto max-w-3xl px-3 text-center text-[11px] text-slate-600">
            Need every field (media, B2B pricing)?{" "}
            <Link to="/catalog/products/create/classic" className="font-medium text-emerald-600 hover:underline">
              Advanced form
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (entry === "quick") {
    return (
      <div>
        <PageHeader
          title="Quick add product"
          description="Creates product + default variant via catalog APIs."
          actions={
            <button type="button" className={btnSecondary} onClick={() => setEntry("pick")}>
              ← Change mode
            </button>
          }
        />
        <div className="mx-auto max-w-md space-y-3">
          {catalogError ? <p className="text-xs text-amber-800">{catalogError}</p> : null}
          {saveError ? <p className="text-xs text-red-700">{saveError}</p> : null}
          <ResourcePanel title="Essentials">
            <div className="space-y-3 p-3">
              <div>
                <label className={lbl}>Product name</label>
                <input
                  className={inp}
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Gold Ring"
                />
              </div>
              <div>
                <label className={lbl}>Slug (optional)</label>
                <input
                  className={inp}
                  value={quickSlug}
                  onChange={(e) => setQuickSlug(e.target.value)}
                  placeholder="auto from name"
                />
              </div>
              <div>
                <label className={lbl}>Industry (optional — filters categories)</label>
                <select className={inp} value={quickIndustryId} onChange={(e) => setQuickIndustryId(e.target.value)}>
                  <option value="">All industries</option>
                  {industries.map((i) => (
                    <option key={i.industryId} value={i.industryId}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Category *</label>
                <select className={inp} value={quickCategoryId} onChange={(e) => setQuickCategoryId(e.target.value)}>
                  <option value="">{flatCategoryOptions.length ? "Select…" : "No categories"}</option>
                  {flatCategoryOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label className={lbl}>Brand</label>
                  <select className={inp} value={quickBrandSelect} onChange={(e) => setQuickBrandSelect(e.target.value)}>
                    {quickBrandFieldOptions.map((o) => (
                      <option key={o.value} value={o.value} disabled={o.disabled}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {quickBrandSelect === "__text__" ? (
                <input
                  className={inp}
                  value={quickBrandOther}
                  onChange={(e) => setQuickBrandOther(e.target.value)}
                  placeholder="Brand display name"
                />
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Price</label>
                  <input className={inp} value={quickPrice} onChange={(e) => setQuickPrice(e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Stock</label>
                  <input className={inp} value={quickStock} onChange={(e) => setQuickStock(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={lbl}>Image (optional)</label>
                <div className="flex items-center gap-2 rounded-sm border border-dashed border-slate-200 bg-slate-50 px-2 py-4 text-center text-[11px] text-slate-500">
                  <ImagePlus className="mx-auto h-6 w-6 opacity-60" />
                  Use advanced form for image upload.
                </div>
              </div>
              <button type="button" className={`${btnPrimary} w-full`} disabled={saving} onClick={() => void quickSave()}>
                {saving ? "Saving…" : "Save product"}
              </button>
            </div>
          </ResourcePanel>
        </div>
      </div>
    );
  }

  /* manual wizard */
  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1">
        <PageHeader
          title="Add product · Wizard"
          description="Save / publish calls tenant catalog APIs (product, variants, inventory)."
          actions={
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={btnSecondary} onClick={() => setEntry("pick")}>
                ← Mode
              </button>
              <Link to="/catalog/products/create/classic" className={btnSecondary}>
                Advanced form
              </Link>
              <button type="button" className={btnSecondary} disabled={saving} onClick={() => void persistProduct("draft")}>
                Save draft
              </button>
              <button type="button" className={btnPrimary} disabled={saving} onClick={() => void persistProduct("publish")}>
                {saving ? "Saving…" : "Publish product"}
              </button>
            </div>
          }
        />

        {catalogError ? <p className="mb-2 text-xs text-amber-800">{catalogError}</p> : null}
        {saveError ? <p className="mb-2 text-xs text-red-700">{saveError}</p> : null}

        <div className="-mx-1 mb-3 overflow-x-auto border-b border-slate-200">
          <nav className="flex min-w-max gap-px px-1">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={[
                  "flex items-center gap-0.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-[11px] font-medium transition-colors",
                  step === s.id
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
                ].join(" ")}
              >
                <span className="text-slate-400">{s.id}</span>
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {step === 1 ? (
          <ResourcePanel title="Basic information">
            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={lbl}>Product name</label>
                <input className={inp} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Slug</label>
                <input
                  className={inp}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto from name"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <label className={lbl}>Brand</label>
                    <select className={inp} value={brandSelectValue} onChange={(e) => setBrandSelectValue(e.target.value)}>
                      {manualBrandFieldOptions.map((o) => (
                        <option key={o.value} value={o.value} disabled={o.disabled}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" variant="secondary" className="shrink-0 text-xs" onClick={() => setBrandModalOpen(true)}>
                    Add brand
                  </Button>
                </div>
                {brandSelectValue === "__text__" ? (
                  <input
                    className={inp}
                    value={brandOtherText}
                    onChange={(e) => setBrandOtherText(e.target.value)}
                    placeholder="Brand display name"
                  />
                ) : null}
              </div>
              <div>
                <label className={lbl}>Status</label>
                <select className={inp} value={status} onChange={(e) => setStatus(e.target.value as "draft" | "active")}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Description</label>
                <textarea className={`${inp} min-h-[88px]`} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          </ResourcePanel>
        ) : null}

        {step === 2 ? (
          <ResourcePanel title="Category">
            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={lbl}>Filter by industry (optional)</label>
                <select
                  className={inp}
                  value={categoryIndustryFilter}
                  onChange={(e) => {
                    setCategoryIndustryFilter(e.target.value);
                    setCategoryPrimary("");
                    setCategorySub("");
                  }}
                >
                  <option value="">All industries</option>
                  {industries.map((i) => (
                    <option key={i.industryId} value={i.industryId}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Primary category</label>
                <select
                  className={inp}
                  value={categoryPrimary}
                  onChange={(e) => {
                    setCategoryPrimary(e.target.value);
                    setCategorySub("");
                  }}
                >
                  <option value="">{rootCategories.length ? "Select…" : "No categories"}</option>
                  {rootCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Sub category</label>
                <select className={inp} value={categorySub} onChange={(e) => setCategorySub(e.target.value)} disabled={!categoryPrimary}>
                  <option value="">{subCategories.length ? "Optional" : "No sub-categories"}</option>
                  {subCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Link to="/catalog/categories" className={`${btnSecondary} inline-flex text-[11px]`}>
                  Manage categories
                </Link>
                <p className="mt-1 text-[10px] text-slate-500">Master + tenant categories from GET /categories.</p>
                {categories.length > 0 && rootCategories.length === 0 ? (
                  <p className="mt-2 text-[11px] text-amber-800">
                    {categoryIndustryFilter
                      ? "Is industry filter se koi root category match nahi ho rahi — “All industries” chun ke dekho."
                      : "Primary list sirf root categories dikhati hai (jinke parent nahi). Agar sab ke parent set hain to pehle ek top-level category banao."}
                  </p>
                ) : null}
              </div>
            </div>
          </ResourcePanel>
        ) : null}

        {step === 3 ? (
          <ResourcePanel title="Product attributes">
            <div className="space-y-3 p-3">
              <p className="text-[11px] text-slate-600">
                Attributes and allowed values load from the catalog API. Pick which attributes apply to this product and
                which value subset to use for variant combinations (step 4).
              </p>
              {!attrCatalog.length ? (
                <p className="text-[11px] text-amber-800">No attributes yet — add some under Catalog → Attributes.</p>
              ) : null}
              {attrSelections.map((row) => (
                <div key={row.key} className="grid gap-2 rounded-sm border border-slate-100 p-2 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <label className={lbl}>Catalog attribute</label>
                    <select
                      className={inp}
                      value={row.attributeId}
                      onChange={(e) => onAttributePicked(row.key, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {attrCatalog.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-7">
                    <label className={lbl}>Values for this product (comma-separated)</label>
                    <input
                      className={inp}
                      value={row.valuesCsv}
                      onChange={(e) => updateSelectionRow(row.key, { valuesCsv: e.target.value })}
                      placeholder="e.g. Red, Blue or pick attribute above to prefill"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-1">
                    <button
                      type="button"
                      className={`${btnSecondary} w-full px-1 py-1.5 text-[10px]`}
                      onClick={() => setAttrSelections((p) => p.filter((r) => r.key !== row.key))}
                      aria-label="Remove attribute row"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`${btnSecondary} text-[11px]`}
                  onClick={() => setAttrSelections((p) => [...p, { key: randomId(), attributeId: "", valuesCsv: "" }])}
                >
                  + Add attribute
                </button>
                <button type="button" className={`${btnPrimary} text-[11px]`} onClick={() => regenerateVariants()}>
                  Regenerate variants
                </button>
                <Link to="/catalog/attributes" className={`${btnSecondary} inline-flex items-center text-[11px]`}>
                  Manage attributes
                </Link>
              </div>
            </div>
          </ResourcePanel>
        ) : null}

        {step === 4 ? (
          <ResourcePanel title="Variants (auto-generated)">
            <div className="p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-600">Cartesian product of attribute values → SKUs.</p>
                <button type="button" className={`${btnSecondary} text-[11px]`} onClick={regenerateVariants}>
                  Regenerate table
                </button>
              </div>
              <div className="overflow-x-auto rounded-sm border border-slate-200">
                <table className="w-full min-w-[480px] text-left text-[11px]">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5">Variant</th>
                      <th className="px-2 py-1.5">SKU</th>
                      <th className="px-2 py-1.5">Price</th>
                      <th className="px-2 py-1.5">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      variants.length
                        ? variants
                        : buildVariantRowsFromAttrDefs(
                            buildAttrDefsFromSelections(attrSelections, attrCatalog),
                            baseSku,
                            price.trim() || "999",
                          )
                    ).map((v) => (
                      <tr key={v.id} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 text-slate-800">
                          {Object.keys(v.attributesJson ?? {}).length ? comboLabel(v.attributesJson) : v.label}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={inp}
                            value={v.sku}
                            onChange={(e) => updateVariantRow(v.id, { sku: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={inp}
                            value={v.price}
                            onChange={(e) => updateVariantRow(v.id, { price: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className={inp}
                            value={v.stock}
                            onChange={(e) => updateVariantRow(v.id, { stock: e.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ResourcePanel>
        ) : null}

        {step === 5 ? (
          <ResourcePanel title="Images">
            <div className="p-4 text-center text-[11px] text-slate-500">
              Image upload uses the advanced product form for now.
            </div>
          </ResourcePanel>
        ) : null}

        {step === 6 ? (
          <ResourcePanel title="Pricing">
            <div className="grid gap-3 p-3 sm:grid-cols-3">
              <div>
                <label className={lbl}>MRP</label>
                <input className={inp} value={mrp} onChange={(e) => setMrp(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Selling price</label>
                <input className={inp} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Cost price</label>
                <input className={inp} value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>
          </ResourcePanel>
        ) : null}

        {step === 7 ? (
          <ResourcePanel title="Inventory & B2B pricing">
            <div className="grid gap-3 p-3 sm:grid-cols-3">
              <div className="sm:col-span-3 border-b border-slate-100 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Inventory (display — first variant stock saved on submit)
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Warehouse label</label>
                <input className={inp} value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Stock (legacy field)</label>
                <input className={inp} value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Reserved (display only)</label>
                <input className={inp} value={reserved} onChange={(e) => setReserved(e.target.value)} />
              </div>
              <div className="sm:col-span-3 mt-2 border-b border-slate-100 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                B2B (optional)
              </div>
              <div className="sm:col-span-3 text-[11px] text-slate-600">
                Customer prices, group prices, quantity tiers — use the pricing page after save.
              </div>
            </div>
          </ResourcePanel>
        ) : null}

        {step === 8 ? (
          <ResourcePanel title="SEO">
            <div className="grid gap-3 p-3">
              <div>
                <label className={lbl}>Meta title</label>
                <input className={inp} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Meta description</label>
                <textarea className={`${inp} min-h-[72px]`} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Tags (comma-separated)</label>
                <input className={inp} value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
            </div>
          </ResourcePanel>
        ) : null}

        <div className="mt-4 flex justify-between">
          <button
            type="button"
            className={btnSecondary}
            disabled={step <= 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </button>
          <button
            type="button"
            className={`${btnPrimary} inline-flex items-center gap-1`}
            disabled={step >= 8}
            onClick={() => setStep((s) => Math.min(8, s + 1))}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {brandModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wiz-brand-modal-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
            <h3 id="wiz-brand-modal-title" className="text-sm font-semibold text-slate-900">
              Add custom brand
            </h3>
            <div className="mt-4 space-y-3">
              <FormInput id="wiz-nb-name" label="Brand name" required value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} />
              <div>
                <label htmlFor="wiz-nb-desc" className="block text-xs font-medium text-slate-700">
                  Description (optional)
                </label>
                <textarea
                  id="wiz-nb-desc"
                  rows={2}
                  value={newBrandDescription}
                  onChange={(e) => setNewBrandDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setBrandModalOpen(false);
                  setNewBrandName("");
                  setNewBrandDescription("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={brandSaving || !newBrandName.trim()}
                onClick={() => {
                  const nm = newBrandName.trim();
                  if (!nm) return;
                  setBrandSaving(true);
                  void createTenantBrand({
                    name: nm,
                    description: newBrandDescription.trim() || undefined,
                  })
                    .then((res) => {
                      const row = res.data;
                      setBrandOptions((prev) => [
                        ...prev,
                        { id: row.id, type: "tenant", name: row.name, slug: row.slug, logoUrl: null },
                      ]);
                      setBrandSelectValue(`t:${row.id}`);
                      setBrandModalOpen(false);
                      setNewBrandName("");
                      setNewBrandDescription("");
                    })
                    .catch(() => setSaveError("Could not create brand."))
                    .finally(() => setBrandSaving(false));
                }}
              >
                {brandSaving ? "Saving…" : "Save brand"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
