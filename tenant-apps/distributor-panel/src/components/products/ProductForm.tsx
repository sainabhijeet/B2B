import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormInput } from "@/components/forms/FormInput";
import { FormSelect } from "@/components/forms/FormSelect";
import { Button } from "@/components/ui/Button";
import { AttributeSelector } from "@/components/products/AttributeSelector";
import { VariantTable, type VariantDraft } from "@/components/products/VariantTable";
import { ImageUploader, type ImageDraft } from "@/components/products/ImageUploader";
import { SeoForm } from "@/components/products/SeoForm";
import { comboLabel } from "@/components/products/variantUtils";
import type { AttrDef } from "@/components/products/variantUtils";
import {
  addProductImage,
  createProduct,
  createVariant,
  fetchProduct,
  updateProduct,
  updateVariant,
  upsertInventory,
} from "@/api/productsApi";
import { createTenantBrand, fetchBrandOptions } from "@/api/brandsApi";
import { fetchCategories } from "@/api/categoriesApi";
import { ApiError } from "@/lib/apiClient";
import type { FormSelectOption } from "@/components/forms/FormSelect";
import type { CategoryRow } from "@/types/category";
import type { MergedBrandOption } from "@/api/brandsApi";
import type { CreateProductBody, ProductDetailBundle, UpdateProductBody } from "@/types/product";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);
}

function randomKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}`;
}

type Props = {
  mode: "create" | "edit";
  productId?: string;
  onSaved: () => void;
  staffReadOnly: boolean;
};

export function ProductForm({ mode, productId, onSaved, staffReadOnly }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const initialImageUrls = useRef<Set<string>>(new Set());

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [brandOptions, setBrandOptions] = useState<MergedBrandOption[]>([]);
  /** "", "m:uuid", "t:uuid", "__text__" (free-text label, not linked to catalog row). */
  const [brandSelectValue, setBrandSelectValue] = useState("");
  const [brandOtherText, setBrandOtherText] = useState("");
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDescription, setNewBrandDescription] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const [status, setStatus] = useState("draft");
  const [categoryId, setCategoryId] = useState("");
  const [tagsText, setTagsText] = useState("");

  const [attributes, setAttributes] = useState<AttrDef[]>([]);

  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [taxRate, setTaxRate] = useState("0");

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");

  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [images, setImages] = useState<ImageDraft[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const baseSku = useMemo(() => {
    const fromRows = variants[0]?.sku;
    if (fromRows && fromRows.includes("-")) return fromRows.split("-")[0] ?? fromRows;
    return "";
  }, [variants]);

  const applyDetail = useCallback((bundle: ProductDetailBundle) => {
    const p = bundle.product;
    setName(p.name);
    setSlug(p.slug);
    setSlugManual(true);
    setDescription(p.description === "—" ? "" : p.description);
    const slot = p.brandSlot;
    if (slot?.kind === "master") {
      setBrandSelectValue(`m:${slot.masterBrandId}`);
      setBrandOtherText("");
    } else if (slot?.kind === "tenant") {
      setBrandSelectValue(`t:${slot.brandId}`);
      setBrandOtherText("");
    } else {
      const legacy =
        (slot?.kind === "none" && slot.legacyName?.trim()) || (p.brand && !p.brandId ? p.brand : "") || "";
      if (legacy) {
        setBrandSelectValue("__text__");
        setBrandOtherText(legacy);
      } else {
        setBrandSelectValue("");
        setBrandOtherText("");
      }
    }
    setStatus(p.status);
    setCategoryId(p.categoryId);
    setTagsText(Array.isArray(p.tags) && p.tags.length ? p.tags.join(", ") : "");
    setPrice(p.price);
    setMrp(p.mrp);
    setCostPrice(p.costPrice ?? "");
    setTaxRate(p.taxRate ?? "0");
    setMetaTitle(p.metaTitle ?? "");
    setMetaDescription(p.metaDescription ?? "");
    setMetaKeywords(p.metaKeywords ?? "");

    const vRows: VariantDraft[] = bundle.variants.map((v) => {
      const attrs = (v.attributesJson ?? {}) as Record<string, string>;
      const inv = bundle.inventory.find((i) => i.variantId === v.id);
      const stock = inv != null ? String(inv.stockQuantity) : String(v.stockQuantity ?? 0);
      return {
        key: v.id,
        serverId: v.id,
        label: comboLabel(attrs) || "Variant",
        sku: v.variantSku,
        price: v.price,
        mrp: v.mrp,
        stock,
        attributesJson: attrs,
      };
    });
    setVariants(vRows.length ? vRows : []);

    const vIndex = (vid: string | null | undefined) => {
      if (!vid) return null;
      const idx = bundle.variants.findIndex((x) => x.id === vid);
      return idx >= 0 ? idx : null;
    };
    initialImageUrls.current = new Set(bundle.images.map((i) => i.imageUrl));
    setImages(
      bundle.images.map((im) => ({
        key: im.id,
        url: im.imageUrl,
        isThumbnail: im.isThumbnail,
        variantRowIndex: vIndex(im.variantId),
      })),
    );
  }, []);

  useEffect(() => {
    void fetchCategories({ page: 1, limit: 100 }).then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    if (staffReadOnly) return;
    void fetchBrandOptions()
      .then((r) => setBrandOptions(r.data ?? []))
      .catch(() => setBrandOptions([]));
  }, [staffReadOnly]);

  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    setLoading(true);
    setLoadError(null);
    void fetchProduct(productId)
      .then((res) => applyDetail(res.data))
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Failed to load product"))
      .finally(() => setLoading(false));
  }, [mode, productId, applyDetail]);

  useEffect(() => {
    if (mode !== "create") return;
    if (variants.length > 0) return;
    setVariants([
      {
        key: randomKey(),
        label: "Default",
        sku: "",
        price: "0",
        mrp: "0",
        stock: "0",
        attributesJson: {},
      },
    ]);
  }, [mode, variants.length]);

  useEffect(() => {
    if (mode !== "create") return;
    if (variants.length !== 1 || variants[0].serverId) return;
    const base = slugify(name).toUpperCase().replace(/-/g, "").slice(0, 20) || "SKU";
    const skuPad = name ? base : "";
    if (!variants[0].sku && skuPad) {
      setVariants((prev) =>
        prev.map((r, i) => (i === 0 ? { ...r, sku: `${skuPad}-001`.slice(0, 120) } : r)),
      );
    }
  }, [mode, name, variants]);

  const brandFieldOptions = useMemo((): FormSelectOption[] => {
    const masters = brandOptions.filter((b) => b.type === "master");
    const mine = brandOptions.filter((b) => b.type === "tenant");
    const out: FormSelectOption[] = [{ value: "", label: "— No catalog brand —" }];
    if (masters.length) {
      out.push({ value: "__ph_m__", label: "Platform brands", disabled: true });
      for (const b of masters) {
        out.push({ value: `m:${b.id}`, label: b.name });
      }
    }
    if (mine.length) {
      out.push({ value: "__ph_t__", label: "My brands", disabled: true });
      for (const b of mine) {
        out.push({ value: `t:${b.id}`, label: b.name });
      }
    }
    out.push({ value: "__text__", label: "Other (typed name only, not linked)" });
    return out;
  }, [brandOptions]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Select primary category" },
      ...categories.map((c) => ({
        value: c.id,
        label: `${c.name}${c.tenantId == null ? " · Master" : ""}`,
      })),
    ],
    [categories],
  );

  const variantLabels = variants.map((v) => v.label);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (staffReadOnly) return;
    if (!categoryId || !name.trim() || !slug.trim()) {
      setSaveError("Name, slug, and primary category are required.");
      return;
    }
    if (!variants.length) {
      setSaveError("Add at least one variant row.");
      return;
    }
    const sku0 = variants[0]?.sku?.trim();
    if (mode === "create" && !sku0) {
      setSaveError("First variant SKU is required (also stored as the product SKU).");
      return;
    }
    for (const row of variants) {
      if (!row.sku.trim()) {
        setSaveError("Each variant needs a SKU.");
        return;
      }
    }

    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const slugVal = (slugManual ? slug : slugify(name) || slug).trim();

    setSaving(true);
    try {
      let pid = productId!;
      if (mode === "create") {
        const brandExtra: Partial<CreateProductBody> = {};
        if (brandSelectValue.startsWith("m:")) {
          brandExtra.brandMasterId = brandSelectValue.slice(2);
        } else if (brandSelectValue.startsWith("t:")) {
          brandExtra.brandId = brandSelectValue.slice(2);
        } else if (brandSelectValue === "__text__") {
          const t = brandOtherText.trim();
          if (t) brandExtra.brand = t;
        }

        const created = await createProduct({
          name: name.trim(),
          slug: slugVal,
          sku: sku0!,
          description: (description.trim() || "—").trim(),
          categoryId,
          price: (price.trim() || "0").trim(),
          mrp: (mrp.trim() || price.trim() || "0").trim(),
          taxRate: (taxRate.trim() || "0").trim(),
          status,
          ...brandExtra,
          costPrice: costPrice.trim() || undefined,
          metaTitle: metaTitle.trim() || undefined,
          metaDescription: metaDescription.trim() || undefined,
          metaKeywords: metaKeywords.trim() || undefined,
          tags: tags.length ? tags : undefined,
        });
        pid = created.data.id;
      } else {
        const brandExtra: Pick<UpdateProductBody, "brandId" | "brandMasterId" | "brand"> =
          brandSelectValue.startsWith("m:")
            ? { brandMasterId: brandSelectValue.slice(2), brandId: null }
            : brandSelectValue.startsWith("t:")
              ? { brandId: brandSelectValue.slice(2), brandMasterId: null }
              : brandSelectValue === "__text__"
                ? {
                    brandId: null,
                    brandMasterId: null,
                    brand: brandOtherText.trim() || "",
                  }
                : {
                    brandId: null,
                    brandMasterId: null,
                    brand: "",
                  };

        const patch: UpdateProductBody = {
          name: name.trim(),
          slug: slugVal,
          description: (description.trim() || "—").trim(),
          categoryId,
          price: (price.trim() || "0").trim(),
          mrp: (mrp.trim() || price.trim() || "0").trim(),
          taxRate: (taxRate.trim() || "0").trim(),
          status,
          ...brandExtra,
        };
        if (costPrice.trim()) patch.costPrice = costPrice.trim();
        if (metaTitle.trim()) patch.metaTitle = metaTitle.trim();
        if (metaDescription.trim()) patch.metaDescription = metaDescription.trim();
        if (metaKeywords.trim()) patch.metaKeywords = metaKeywords.trim();
        patch.tags = tags;
        await updateProduct(pid, patch);
      }

      const variantIds: string[] = [];
      for (let i = 0; i < variants.length; i++) {
        const row = variants[i];
        const stockQty = Math.max(0, Math.floor(Number(row.stock) || 0));
        const attrs = row.attributesJson as Record<string, unknown>;
        if (row.serverId) {
          await updateVariant(pid, row.serverId, {
            variantSku: row.sku.trim(),
            price: row.price.trim(),
            mrp: row.mrp.trim(),
            stockQuantity: stockQty,
            attributesJson: attrs,
            status: "active",
          });
          variantIds.push(row.serverId);
        } else {
          const res = await createVariant(pid, {
            variantSku: row.sku.trim(),
            price: row.price.trim(),
            mrp: row.mrp.trim(),
            stockQuantity: stockQty,
            attributesJson: attrs,
            status: "active",
          });
          variantIds.push(res.data.id);
        }
      }

      let pos = 0;
      for (const img of images) {
        const u = img.url.trim();
        if (!u) continue;
        if (mode === "edit" && initialImageUrls.current.has(u)) continue;
        const variantId =
          img.variantRowIndex != null ? variantIds[img.variantRowIndex] ?? undefined : undefined;
        await addProductImage(pid, {
          imageUrl: u,
          isThumbnail: img.isThumbnail,
          position: pos++,
          variantId,
          imageSizeMb: 0.01,
        });
      }

      for (let i = 0; i < variantIds.length; i++) {
        const st = Math.max(0, Math.floor(Number(variants[i]?.stock) || 0));
        await upsertInventory({
          productId: pid,
          variantId: variantIds[i],
          stockQuantity: st,
          lowStockThreshold: 0,
        });
      }

      void queryClient.invalidateQueries({ queryKey: ["products"] });
      onSaved();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (staffReadOnly) {
    return (
      <div>
        <PageHeader title="Product" description="Read-only access for your role." />
        <Link to="/catalog/products" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Back to products
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading product…</p>;
  }
  if (loadError) {
    return (
      <div>
        <p className="text-sm text-red-700">{loadError}</p>
        <Link to="/catalog/products" className="mt-2 inline-block text-sm text-emerald-700 hover:underline">
          ← Products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/catalog/products"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Products
        </Link>
      </div>
      <PageHeader
        title={mode === "create" ? "Create product" : "Edit product"}
        description="Save runs POST/PATCH product, then variants, images, and inventory. B2B per-customer, group, and quantity pricing is managed separately."
      />
      {mode === "edit" && productId ? (
        <p className="mb-6 text-sm">
          <Link
            to={`/catalog/products/${productId}/pricing`}
            className="font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            B2B pricing (customer, group, quantity tiers) →
          </Link>
        </p>
      ) : null}

      <form className="mx-auto max-w-4xl space-y-8" onSubmit={onSubmit}>
        <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-slate-800">Basic info</legend>
          <FormInput id="pf-name" label="Product name" required value={name} onChange={(e) => setName(e.target.value)} />
          <FormInput
            id="pf-slug"
            label="Slug"
            required
            value={slugManual ? slug : slugify(name) || slug}
            onChange={(e) => {
              setSlugManual(true);
              setSlug(e.target.value);
            }}
          />
          <div>
            <label htmlFor="pf-desc" className="block text-xs font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="pf-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <FormSelect
                    id="pf-brand-select"
                    label="Brand"
                    value={brandSelectValue}
                    onChange={(e) => setBrandSelectValue(e.target.value)}
                    options={brandFieldOptions}
                    hint="Platform catalog + your custom brands. Pick “Other” for a plain label without a catalog link."
                  />
                </div>
                <Button type="button" variant="secondary" className="shrink-0" onClick={() => setBrandModalOpen(true)}>
                  Add brand
                </Button>
              </div>
              {brandSelectValue === "__text__" ? (
                <FormInput
                  id="pf-brand-other"
                  label="Brand name (display only)"
                  value={brandOtherText}
                  onChange={(e) => setBrandOtherText(e.target.value)}
                />
              ) : null}
            </div>
            <FormSelect
              id="pf-status"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
              ]}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-slate-800">Category & tags</legend>
          <FormSelect
            id="pf-cat"
            label="Primary category"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoryOptions}
            hint="Master + tenant categories from the catalog API."
          />
          <div>
            <label className="block text-xs font-medium text-slate-700">Additional categories</label>
            <p className="mt-1 rounded-md border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Multi-category junction is not in the API yet. Use tags temporarily (e.g. category slugs) if you need
              merchandising hints.
            </p>
          </div>
          <FormInput
            id="pf-tags"
            label="Tags"
            hint="Comma-separated labels (stored as JSON on the product)."
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </fieldset>

        <AttributeSelector attributes={attributes} onChange={setAttributes} disabled={saving} />

        <VariantTable
          baseSku={baseSku || slugify(name).toUpperCase().slice(0, 24) || "SKU"}
          sellingPrice={price}
          mrp={mrp}
          attributes={attributes}
          rows={variants}
          onChangeRows={setVariants}
          disabled={saving}
        />

        <ImageUploader images={images} onChange={setImages} variantRowLabels={variantLabels} disabled={saving} />

        <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-slate-800">Pricing</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormInput id="pf-mrp" label="MRP" inputMode="decimal" value={mrp} onChange={(e) => setMrp(e.target.value)} />
            <FormInput
              id="pf-price"
              label="Selling price"
              inputMode="decimal"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <FormInput
              id="pf-cost"
              label="Cost price"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </div>
          <FormInput id="pf-tax" label="Tax %" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </fieldset>

        <fieldset className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-700">B2B pricing</legend>
          <p className="text-sm text-slate-600">
            Customer-specific <code className="rounded bg-white px-1 text-xs">customer_prices</code> will appear here
            when the distributor pricing API is available.
          </p>
        </fieldset>

        <fieldset className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-5">
          <legend className="px-1 text-sm font-semibold text-slate-700">Inventory</legend>
          <p className="text-sm text-slate-600">
            Per-variant stock is in the variants table. Warehouse / reserved columns need a warehouse entity on the
            backend — stock is synced to the <code className="rounded bg-white px-1 text-xs">inventory</code> table on
            save.
          </p>
        </fieldset>

        <SeoForm
          metaTitle={metaTitle}
          metaDescription={metaDescription}
          metaKeywords={metaKeywords}
          disabled={saving}
          onChange={(p) => {
            if (p.metaTitle !== undefined) setMetaTitle(p.metaTitle);
            if (p.metaDescription !== undefined) setMetaDescription(p.metaDescription);
            if (p.metaKeywords !== undefined) setMetaKeywords(p.metaKeywords);
          }}
        />

        {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <Button type="submit" disabled={saving || !categoryId}>
            {saving ? "Saving…" : "Save product"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/catalog/products")}>
            Cancel
          </Button>
        </div>
      </form>

      {brandModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="brand-modal-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
            <h3 id="brand-modal-title" className="text-sm font-semibold text-slate-900">
              Add custom brand
            </h3>
            <p className="mt-1 text-xs text-slate-600">Saved under your store. You can link products to it immediately.</p>
            <div className="mt-4 space-y-3">
              <FormInput
                id="new-brand-name"
                label="Brand name"
                required
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
              />
              <div>
                <label htmlFor="new-brand-desc" className="block text-xs font-medium text-slate-700">
                  Description (optional)
                </label>
                <textarea
                  id="new-brand-desc"
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
                        {
                          id: row.id,
                          type: "tenant" as const,
                          name: row.name,
                          slug: row.slug,
                          logoUrl: null,
                        },
                      ]);
                      setBrandSelectValue(`t:${row.id}`);
                      setBrandModalOpen(false);
                      setNewBrandName("");
                      setNewBrandDescription("");
                    })
                    .catch(() => {
                      setSaveError("Could not create brand.");
                    })
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
