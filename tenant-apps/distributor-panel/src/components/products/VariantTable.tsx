import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AttrDef } from "@/components/products/variantUtils";
import { attributeCombinations, comboLabel } from "@/components/products/variantUtils";

export type VariantDraft = {
  key: string;
  serverId?: string;
  label: string;
  sku: string;
  price: string;
  mrp: string;
  stock: string;
  attributesJson: Record<string, string>;
};

type Props = {
  baseSku: string;
  sellingPrice: string;
  mrp: string;
  attributes: AttrDef[];
  rows: VariantDraft[];
  onChangeRows: (rows: VariantDraft[]) => void;
  onGenerateFromAttributes?: () => void;
  disabled?: boolean;
};

function randomKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random()}`;
}

export function VariantTable({
  baseSku,
  sellingPrice,
  mrp,
  attributes,
  rows,
  onChangeRows,
  onGenerateFromAttributes,
  disabled,
}: Props) {
  function updateRow(index: number, patch: Partial<VariantDraft>) {
    onChangeRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function generate() {
    const combos = attributeCombinations(attributes);
    if (!combos.length) return;
    const next: VariantDraft[] = combos.map((attrs, idx) => {
      const slug = Object.values(attrs)
        .join("-")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .slice(0, 40);
      const sku = `${baseSku}-${slug || String(idx + 1)}`.slice(0, 120);
      return {
        key: randomKey(),
        label: comboLabel(attrs),
        sku,
        price: sellingPrice || "0",
        mrp: mrp || sellingPrice || "0",
        stock: "0",
        attributesJson: attrs,
      };
    });
    onChangeRows(next);
    onGenerateFromAttributes?.();
  }

  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="px-1 text-sm font-semibold text-slate-800">Variants</legend>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" disabled={disabled} onClick={generate}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Generate from attributes
        </Button>
        <span className="text-xs text-slate-500">SKUs default from base SKU + attribute tokens (must stay unique).</span>
      </div>
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[48rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase text-slate-500">
                Variant
              </th>
              <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase text-slate-500">
                SKU
              </th>
              <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase text-slate-500">
                Price
              </th>
              <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase text-slate-500">
                MRP
              </th>
              <th className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase text-slate-500">
                Stock
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                  No variants yet. Add attributes and generate, or add a single default row below.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.key} className="border-b border-slate-100">
                  <td className="max-w-[14rem] px-2 py-2 align-top text-xs text-slate-700">{row.label}</td>
                  <td className="px-2 py-2 align-top">
                    <input
                      className="w-full min-w-[8rem] rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                      value={row.sku}
                      disabled={disabled}
                      onChange={(e) => updateRow(i, { sku: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      className="w-full min-w-[5rem] rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                      value={row.price}
                      disabled={disabled}
                      onChange={(e) => updateRow(i, { price: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      className="w-full min-w-[5rem] rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                      value={row.mrp}
                      disabled={disabled}
                      onChange={(e) => updateRow(i, { mrp: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      className="w-full min-w-[4rem] rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                      value={row.stock}
                      disabled={disabled}
                      onChange={(e) => updateRow(i, { stock: e.target.value })}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() =>
          onChangeRows([
            ...rows,
            {
              key: randomKey(),
              label: "Custom",
              sku: `${baseSku}-CUSTOM-${rows.length + 1}`.slice(0, 120),
              price: sellingPrice || "0",
              mrp: mrp || sellingPrice || "0",
              stock: "0",
              attributesJson: {},
            },
          ])
        }
      >
        Add variant row
      </Button>
    </fieldset>
  );
}
