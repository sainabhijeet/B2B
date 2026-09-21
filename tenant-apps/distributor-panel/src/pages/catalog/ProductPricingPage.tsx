import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  addGroupMember,
  createCustomerGroup,
  deleteCustomerGroup,
  deleteCustomerPrice,
  deleteGroupPrice,
  deleteQuantityPrice,
  fetchCustomerGroups,
  fetchProductPricingSummary,
  upsertCustomerPrice,
  upsertGroupPrice,
  upsertQuantityPrice,
} from "@/api/catalogPricingApi";
import { fetchCustomers } from "@/api/customersApi";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";
import { useState } from "react";

export function ProductPricingPage() {
  const { productId } = useParams<{ productId: string }>();
  const qc = useQueryClient();
  const { staffReadOnly } = useAuth();
  const readOnly = staffReadOnly;

  const [custVariant, setCustVariant] = useState("");
  const [custCustomer, setCustCustomer] = useState("");
  const [custPrice, setCustPrice] = useState("");
  const [grpVariant, setGrpVariant] = useState("");
  const [grpGroup, setGrpGroup] = useState("");
  const [grpPrice, setGrpPrice] = useState("");
  const [qtyVariant, setQtyVariant] = useState("");
  const [qtyMin, setQtyMin] = useState("10");
  const [qtyPrice, setQtyPrice] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [memGroup, setMemGroup] = useState("");
  const [memCustomer, setMemCustomer] = useState("");
  const [actionErr, setActionErr] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["pricing-summary", productId],
    enabled: !!productId,
    queryFn: () => fetchProductPricingSummary(productId!),
  });

  const customersQuery = useQuery({
    queryKey: ["customers", "pricing-picker"],
    queryFn: () => fetchCustomers({ page: 1, limit: 100 }),
  });

  const groupsOnlyQuery = useQuery({
    queryKey: ["customer-groups"],
    queryFn: fetchCustomerGroups,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["pricing-summary", productId] });
    void qc.invalidateQueries({ queryKey: ["customer-groups"] });
  };

  const mUpsertCust = useMutation({
    mutationFn: () =>
      upsertCustomerPrice({
        customerId: custCustomer,
        productVariantId: custVariant,
        price: custPrice,
      }),
    onSuccess: () => {
      setActionErr(null);
      invalidate();
    },
    onError: (e) => setActionErr(e instanceof ApiError ? e.message : "Save failed"),
  });

  const mUpsertGrp = useMutation({
    mutationFn: () =>
      upsertGroupPrice({
        groupId: grpGroup,
        productVariantId: grpVariant,
        price: grpPrice,
      }),
    onSuccess: () => {
      setActionErr(null);
      invalidate();
    },
    onError: (e) => setActionErr(e instanceof ApiError ? e.message : "Save failed"),
  });

  const mUpsertQty = useMutation({
    mutationFn: () =>
      upsertQuantityPrice({
        productVariantId: qtyVariant,
        minQty: Number.parseInt(qtyMin, 10),
        price: qtyPrice,
      }),
    onSuccess: () => {
      setActionErr(null);
      invalidate();
    },
    onError: (e) => setActionErr(e instanceof ApiError ? e.message : "Save failed"),
  });

  const mCreateGroup = useMutation({
    mutationFn: () => createCustomerGroup(newGroupName.trim()),
    onSuccess: () => {
      setNewGroupName("");
      setActionErr(null);
      invalidate();
      void groupsOnlyQuery.refetch();
    },
    onError: (e) => setActionErr(e instanceof ApiError ? e.message : "Create group failed"),
  });

  const mAddMember = useMutation({
    mutationFn: () => addGroupMember(memGroup, memCustomer),
    onSuccess: () => {
      setActionErr(null);
      invalidate();
    },
    onError: (e) => setActionErr(e instanceof ApiError ? e.message : "Add member failed"),
  });

  const mDelCust = useMutation({
    mutationFn: (id: string) => deleteCustomerPrice(id),
    onSuccess: () => {
      setActionErr(null);
      invalidate();
    },
    onError: (e) => setActionErr(e instanceof ApiError ? e.message : "Delete failed"),
  });

  const mDelGrp = useMutation({
    mutationFn: (id: string) => deleteGroupPrice(id),
    onSuccess: () => {
      setActionErr(null);
      invalidate();
    },
    onError: (e) => setActionErr(e instanceof ApiError ? e.message : "Delete failed"),
  });

  const mDelQty = useMutation({
    mutationFn: (id: string) => deleteQuantityPrice(id),
    onSuccess: () => {
      setActionErr(null);
      invalidate();
    },
    onError: (e) => setActionErr(e instanceof ApiError ? e.message : "Delete failed"),
  });

  const mDelGroupDef = useMutation({
    mutationFn: (id: string) => deleteCustomerGroup(id),
    onSuccess: () => {
      setActionErr(null);
      invalidate();
      void groupsOnlyQuery.refetch();
    },
    onError: (e) => setActionErr(e instanceof ApiError ? e.message : "Delete failed"),
  });

  const data = summaryQuery.data?.data;
  const customers = customersQuery.data?.data ?? [];
  const groupsFromApi = groupsOnlyQuery.data?.data ?? data?.groups ?? [];

  const variantOpts = (data?.variants ?? []).map((v) => ({
    value: v.id,
    label: `${v.variantSku} (list ${v.price})`,
  }));

  if (!productId) {
    return <p className="text-sm text-slate-600">Missing product id.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          to={`/catalog/products/${productId}/edit`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to product
        </Link>
      </div>
      <PageHeader
        title="B2B pricing"
        description="Customer-specific price beats group price; group beats catalog variant list price. Quantity tiers apply after that ladder. Retailer JWT on the storefront PDP uses the same rules."
      />

      {summaryQuery.isLoading && <p className="text-sm text-slate-600">Loading…</p>}
      {summaryQuery.error && (
        <p className="text-sm text-red-700">
          {summaryQuery.error instanceof ApiError ? summaryQuery.error.message : "Could not load pricing."}
        </p>
      )}
      {actionErr && <p className="mb-3 text-sm text-red-700">{actionErr}</p>}

      {data && (
        <div className="space-y-8">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Default (variant) prices</h2>
            <p className="mt-1 text-xs text-slate-600">Edit base MRP/list on the product → Variants tab.</p>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-2">SKU</th>
                  <th className="py-2 pr-2">List</th>
                  <th className="py-2">MRP</th>
                </tr>
              </thead>
              <tbody>
                {data.variants.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-mono text-xs">{v.variantSku}</td>
                    <td className="py-2 pr-2">{v.price}</td>
                    <td className="py-2">{v.mrp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Customer groups</h2>
            <p className="mt-1 text-xs text-slate-600">Create groups (e.g. VIP Retailer), then map retailers in Customers or below.</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-800">
              {groupsFromApi.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1">
                  <span>{g.name}</span>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-xs text-red-700"
                      onClick={() => mDelGroupDef.mutate(g.id)}
                      disabled={mDelGroupDef.isPending}
                    >
                      Delete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {!readOnly && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <FormInput
                  id="new-grp"
                  label="New group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="min-w-[200px]"
                />
                <Button type="button" onClick={() => mCreateGroup.mutate()} disabled={!newGroupName.trim()}>
                  Create group
                </Button>
              </div>
            )}
            {!readOnly && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-700">Add customer to group</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                    value={memGroup}
                    onChange={(e) => setMemGroup(e.target.value)}
                  >
                    <option value="">Select group</option>
                    {groupsFromApi.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                    value={memCustomer}
                    onChange={(e) => setMemCustomer(e.target.value)}
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.mobile}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => mAddMember.mutate()}
                    disabled={!memGroup || !memCustomer}
                  >
                    Add to group
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Customer-specific prices</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2">Customer</th>
                  <th className="py-2">Variant</th>
                  <th className="py-2">Price</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {data.customerPrices.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2">{r.customerName}</td>
                    <td className="py-2 font-mono text-xs">{data.variants.find((v) => v.id === r.productVariantId)?.variantSku}</td>
                    <td className="py-2">{r.price}</td>
                    <td className="py-2 text-right">
                      {!readOnly && (
                        <Button type="button" variant="ghost" className="text-xs text-red-700" onClick={() => mDelCust.mutate(r.id)}>
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!readOnly && (
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <select
                  className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                  value={custCustomer}
                  onChange={(e) => setCustCustomer(e.target.value)}
                >
                  <option value="">Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                  value={custVariant}
                  onChange={(e) => setCustVariant(e.target.value)}
                >
                  <option value="">Variant</option>
                  {variantOpts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <FormInput id="cp-price" label="Price" value={custPrice} onChange={(e) => setCustPrice(e.target.value)} />
                <div className="flex items-end">
                  <Button type="button" onClick={() => mUpsertCust.mutate()} disabled={!custCustomer || !custVariant || !custPrice}>
                    Save
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Group prices</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2">Group</th>
                  <th className="py-2">Variant</th>
                  <th className="py-2">Price</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {data.groupPrices.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2">{r.groupName}</td>
                    <td className="py-2 font-mono text-xs">{data.variants.find((v) => v.id === r.productVariantId)?.variantSku}</td>
                    <td className="py-2">{r.price}</td>
                    <td className="py-2 text-right">
                      {!readOnly && (
                        <Button type="button" variant="ghost" className="text-xs text-red-700" onClick={() => mDelGrp.mutate(r.id)}>
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!readOnly && (
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <select
                  className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                  value={grpGroup}
                  onChange={(e) => setGrpGroup(e.target.value)}
                >
                  <option value="">Group</option>
                  {groupsFromApi.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                  value={grpVariant}
                  onChange={(e) => setGrpVariant(e.target.value)}
                >
                  <option value="">Variant</option>
                  {variantOpts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <FormInput id="gp-price" label="Price" value={grpPrice} onChange={(e) => setGrpPrice(e.target.value)} />
                <div className="flex items-end">
                  <Button type="button" onClick={() => mUpsertGrp.mutate()} disabled={!grpGroup || !grpVariant || !grpPrice}>
                    Save
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Quantity tiers</h2>
            <p className="mt-1 text-xs text-slate-600">Highest tier with min_qty ≤ cart line qty wins (absolute unit price).</p>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2">Variant</th>
                  <th className="py-2">Min qty</th>
                  <th className="py-2">Price</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {data.quantityPrices.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 font-mono text-xs">{data.variants.find((v) => v.id === r.productVariantId)?.variantSku}</td>
                    <td className="py-2">{r.minQty}</td>
                    <td className="py-2">{r.price}</td>
                    <td className="py-2 text-right">
                      {!readOnly && (
                        <Button type="button" variant="ghost" className="text-xs text-red-700" onClick={() => mDelQty.mutate(r.id)}>
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!readOnly && (
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <select
                  className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                  value={qtyVariant}
                  onChange={(e) => setQtyVariant(e.target.value)}
                >
                  <option value="">Variant</option>
                  {variantOpts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <FormInput id="qp-min" label="Min qty" value={qtyMin} onChange={(e) => setQtyMin(e.target.value)} />
                <FormInput id="qp-price" label="Unit price" value={qtyPrice} onChange={(e) => setQtyPrice(e.target.value)} />
                <div className="flex items-end">
                  <Button type="button" onClick={() => mUpsertQty.mutate()} disabled={!qtyVariant || !qtyPrice}>
                    Save tier
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
