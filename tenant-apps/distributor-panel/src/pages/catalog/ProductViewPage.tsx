import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { fetchProduct } from "@/api/productsApi";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";
import { comboLabel } from "@/components/products/variantUtils";

export function ProductViewPage() {
  const { id } = useParams<{ id: string }>();
  const { staffReadOnly } = useAuth();

  const q = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: Boolean(id),
  });

  const err = q.error instanceof ApiError ? q.error.message : q.error ? "Failed to load product." : null;
  const bundle = q.data?.data;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          to="/catalog/products"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Products
        </Link>
        {!staffReadOnly && id ? (
          <Link
            to={`/catalog/products/${id}/edit`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </Link>
        ) : null}
      </div>

      {q.isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      {bundle ? (
        <>
          <PageHeader title={bundle.product.name} description={bundle.product.description} />
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="neutral">SKU {bundle.product.sku}</Badge>
            <Badge variant="neutral">{bundle.product.status}</Badge>
            <Badge variant="neutral">Slug {bundle.product.slug}</Badge>
          </div>

          <section className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Pricing</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">MRP</dt>
                  <dd className="font-mono">{bundle.product.mrp}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Selling</dt>
                  <dd className="font-mono">{bundle.product.price}</dd>
                </div>
                {bundle.product.costPrice ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Cost</dt>
                    <dd className="font-mono">{bundle.product.costPrice}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">SEO</h2>
              <dl className="mt-2 space-y-2 text-sm">
                <div>
                  <dt className="text-xs uppercase text-slate-500">Title</dt>
                  <dd>{bundle.product.metaTitle || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Description</dt>
                  <dd className="text-slate-700">{bundle.product.metaDescription || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-slate-500">Keywords</dt>
                  <dd>{bundle.product.metaKeywords || "—"}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-slate-800">Variants</h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="admin-table w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
                      Label
                    </th>
                    <th className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">SKU</th>
                    <th className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">Price</th>
                    <th className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.variants.map((v) => (
                    <tr key={v.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {comboLabel(v.attributesJson as Record<string, string>) || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{v.variantSku}</td>
                      <td className="px-3 py-2 font-mono text-xs">{v.price}</td>
                      <td className="px-3 py-2 font-mono text-xs">{v.stockQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {bundle.images.length ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-800">Images</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {bundle.images.map((im) => (
                  <li key={im.id} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
                    <a href={im.imageUrl} className="break-all text-emerald-700 hover:underline" target="_blank" rel="noreferrer">
                      {im.imageUrl}
                    </a>
                    {im.isThumbnail ? <span className="ml-2 text-slate-500">(thumbnail)</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
