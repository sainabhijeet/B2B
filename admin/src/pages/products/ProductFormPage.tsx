import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CatalogTenantSelect } from '@/components/catalog/CatalogTenantSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { addProductImage, createProduct, createProductVariant, fetchCategories, fetchProduct, updateProduct, updateProductVariant, upsertProductInventory, type CatalogCategory } from '@/lib/catalogApi';

type Props = { mode: 'create' | 'edit' };
type Form = { name: string; slug: string; sku: string; description: string; categoryId: string; price: string; mrp: string; costPrice: string; taxRate: string; brand: string; tags: string; status: string; variantSku: string; stock: string; lowStock: string; moq: string; imageUrls: string };
const empty: Form = { name: '', slug: '', sku: '', description: '', categoryId: '', price: '', mrp: '', costPrice: '', taxRate: '0', brand: '', tags: '', status: 'draft', variantSku: '', stock: '0', lowStock: '5', moq: '1', imageUrls: '' };
const inputClass = 'w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs';
const labelClass = 'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function ProductFormPage({ mode }: Props) {
  const { id } = useParams(); const [params, setParams] = useSearchParams(); const navigate = useNavigate();
  const [tenantId, setTenantId] = useState(params.get('tenantId') ?? '');
  const [categories, setCategories] = useState<CatalogCategory[]>([]); const [form, setForm] = useState<Form>(empty);
  const [variantId, setVariantId] = useState<string | null>(null); const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(mode === 'edit'); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [slugTouched, setSlugTouched] = useState(mode === 'edit');

  useEffect(() => { if (!tenantId) { setCategories([]); return; } let active = true; fetchCategories({ tenantId, includeGlobal: true, limit: 200 }).then((r) => active && setCategories((r.data ?? []).filter((c) => c.status === 'active'))).catch((cause) => active && setError(cause instanceof ApiError ? cause.message : 'Could not load categories.')); return () => { active = false; }; }, [tenantId]);
  useEffect(() => { if (mode !== 'edit' || !id) return; let active = true; setLoading(true); fetchProduct(id).then((response) => { if (!active) return; const p = response.data.product; const v = response.data.variants[0]; const inv = response.data.inventory.find((row) => row.variantId === v?.id) ?? response.data.inventory[0]; setTenantId(p.tenantId); setParams({ tenantId: p.tenantId }, { replace: true }); setVariantId(v?.id ?? null); setExistingImageUrls(response.data.images.map((image) => image.imageUrl)); setForm({ name: p.name, slug: p.slug, sku: p.sku, description: p.description, categoryId: p.categoryId, price: p.price, mrp: p.mrp, costPrice: p.costPrice ?? '', taxRate: p.taxRate, brand: p.brand ?? '', tags: p.tags.join(', '), status: p.status, variantSku: v?.variantSku ?? `${p.sku}-DEFAULT`, stock: String(inv?.stockQuantity ?? v?.stockQuantity ?? 0), lowStock: String(inv?.lowStockThreshold ?? 5), moq: String(v?.moq ?? 1), imageUrls: '' }); }).catch((cause) => active && setError(cause instanceof ApiError ? cause.message : 'Could not load product.')).finally(() => active && setLoading(false)); return () => { active = false; }; }, [id, mode, setParams]);

  function changeTenant(value: string) { setTenantId(value); setParams(value ? { tenantId: value } : {}, { replace: true }); setForm((f) => ({ ...f, categoryId: '' })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!tenantId) { setError('Select a tenant/app.'); return; }
    if (form.name.trim().length < 2 || form.slug.trim().length < 2 || form.sku.trim().length < 2 || !form.categoryId) { setError('Name, slug, SKU and category are required.'); return; }
    const numbers = [form.price, form.mrp, form.taxRate]; if (numbers.some((value) => value.trim() === '' || Number.isNaN(Number(value)) || Number(value) < 0)) { setError('Price, MRP and tax must be valid non-negative numbers.'); return; }
    const stock = Number(form.stock); const lowStock = Number(form.lowStock); const moq = Number(form.moq); if (![stock, lowStock, moq].every(Number.isInteger) || stock < 0 || lowStock < 0 || moq < 1) { setError('Stock, low-stock threshold and MOQ must be valid whole numbers.'); return; }
    const desiredStatus = form.status; const tags = form.tags.split(',').map((tag) => tag.trim()).filter(Boolean); const body = { name: form.name.trim(), slug: form.slug.trim(), sku: form.sku.trim(), description: form.description.trim() || '—', categoryId: form.categoryId, price: form.price.trim(), mrp: form.mrp.trim(), taxRate: form.taxRate.trim(), status: 'draft', brand: form.brand.trim() || undefined, costPrice: form.costPrice.trim() || undefined, tags };
    setSaving(true); setError(null);
    try {
      let productId = id; let activeVariantId = variantId;
      if (mode === 'create') { const created = await createProduct({ ...body, tenantId }); productId = created.data.id; }
      else if (id) await updateProduct(id, body);
      if (!productId) throw new Error('Product ID was not returned.');
      const variantBody = { variantSku: form.variantSku.trim() || `${form.sku.trim()}-DEFAULT`, price: form.price.trim(), mrp: form.mrp.trim(), stockQuantity: stock, attributesJson: {}, status: 'active', moq, gstRate: form.taxRate.trim() };
      if (activeVariantId) await updateProductVariant(productId, activeVariantId, variantBody); else { const createdVariant = await createProductVariant(productId, variantBody); activeVariantId = createdVariant.data.id; }
      await upsertProductInventory(productId, activeVariantId, stock, lowStock);
      const newImages = form.imageUrls.split(/\r?\n/).map((url) => url.trim()).filter((url) => url && !existingImageUrls.includes(url));
      for (let index = 0; index < newImages.length; index += 1) await addProductImage(productId, newImages[index], existingImageUrls.length + index, existingImageUrls.length === 0 && index === 0);
      await updateProduct(productId, { status: desiredStatus });
      navigate(`/products?tenantId=${encodeURIComponent(tenantId)}`, { replace: true });
    } catch (cause) { setError(cause instanceof ApiError || cause instanceof Error ? cause.message : 'Could not save product. The incomplete record remains a hidden draft.'); }
    finally { setSaving(false); }
  }

  return <form onSubmit={submit}>
    <PageHeader title={mode === 'create' ? 'Add product' : 'Edit product'} description="Products are tenant-specific. Publish only after variant, stock and images are ready." actions={<><Link className={adminBtnSecondary} to={`/products${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`}>← Products</Link><button type="submit" className={adminBtnPrimary} disabled={saving || loading || !tenantId}>{saving ? 'Saving…' : 'Save product'}</button></>} />
    {error ? <div className="mb-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div> : null}
    <div className="mb-3"><CatalogTenantSelect value={tenantId} disabled={mode === 'edit'} onChange={changeTenant} /></div>
    {!tenantId ? <div className="rounded-sm border border-indigo-200 bg-indigo-50 p-5 text-sm text-indigo-900">Select the tenant/app whose catalog you want to manage.</div> : <div className="grid gap-4 lg:grid-cols-2">
      <ResourcePanel title="Product information"><div className="grid gap-3 p-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className={labelClass}>Product name *</span><input className={inputClass} value={form.name} onChange={(e) => { const name = e.target.value; setForm((f) => ({ ...f, name, ...(!slugTouched ? { slug: slugify(name) } : {}) })); }} /></label>
        <label><span className={labelClass}>Slug *</span><input className={inputClass} value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }} /></label>
        <label><span className={labelClass}>SKU *</span><input className={inputClass} value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))} /></label>
        <label className="sm:col-span-2"><span className={labelClass}>Category *</span><select className={inputClass} value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.tenantId == null ? ' · Global' : ''}</option>)}</select></label>
        <label className="sm:col-span-2"><span className={labelClass}>Description</span><textarea className={`${inputClass} min-h-24`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
        <label><span className={labelClass}>Brand</span><input className={inputClass} value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} /></label>
        <label><span className={labelClass}>Tags (comma separated)</span><input className={inputClass} value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} /></label>
        <label><span className={labelClass}>Final status</span><select className={inputClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}><option value="draft">Draft</option><option value="active">Active / published</option><option value="inactive">Inactive</option></select></label>
      </div></ResourcePanel>
      <ResourcePanel title="Pricing, variant and inventory"><div className="grid gap-3 p-3 sm:grid-cols-2">
        {[['price', 'Selling price *'], ['mrp', 'MRP *'], ['costPrice', 'Cost price'], ['taxRate', 'Tax / GST % *'], ['variantSku', 'Variant SKU'], ['stock', 'Stock quantity'], ['lowStock', 'Low-stock alert'], ['moq', 'Minimum order quantity']] .map(([key, label]) => <label key={key}><span className={labelClass}>{label}</span><input type={['variantSku'].includes(key) ? 'text' : 'number'} min={key === 'moq' ? '1' : '0'} step={['stock', 'lowStock', 'moq'].includes(key) ? '1' : '0.01'} className={inputClass} value={form[key as keyof Form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} /></label>)}
      </div></ResourcePanel>
      <div className="lg:col-span-2"><ResourcePanel title="Product images"><div className="p-3"><label><span className={labelClass}>New image URLs (one per line)</span><textarea className={`${inputClass} min-h-24 font-mono`} value={form.imageUrls} onChange={(e) => setForm((f) => ({ ...f, imageUrls: e.target.value }))} placeholder="https://cdn.example.com/product.webp" /></label>{existingImageUrls.length ? <div className="mt-3 text-xs text-slate-600">Existing images: {existingImageUrls.map((url) => <div key={url} className="truncate font-mono">{url}</div>)}</div> : null}</div></ResourcePanel></div>
    </div>}
  </form>;
}
