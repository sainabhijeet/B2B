import { PageHeader } from "@/components/ui/PageHeader";

/** Backend warehouse CRUD is not exposed yet — inventory is variant-level via `POST /inventory`. */
export function WarehousesInfoPage() {
  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Multi-warehouse entities will map to `warehouses` + per-location inventory. Today, stock is managed per product/variant from the catalog product screen and `POST /inventory`."
      />
      <div className="mt-4 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Use <strong>Stock</strong> under Inventory for a tenant-wide view of on-hand totals, then open a product to edit
        variant stock and low-stock thresholds.
      </div>
    </div>
  );
}
