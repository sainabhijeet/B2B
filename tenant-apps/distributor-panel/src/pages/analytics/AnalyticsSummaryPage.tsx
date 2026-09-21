import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Package, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchOrders } from "@/api/ordersApi";
import { fetchProducts } from "@/api/productsApi";
import { ApiError } from "@/lib/apiClient";
import { fetchWhatsappAnalytics } from "@/lib/distributorPanelApi";

function formatInr(amount: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function AnalyticsSummaryPage() {
  const ordersQ = useQuery({
    queryKey: ["distributor", "orders", "analytics"],
    queryFn: async () => (await fetchOrders()).data ?? [],
  });
  const productsQ = useQuery({
    queryKey: ["distributor", "products", "count"],
    queryFn: () => fetchProducts({ page: 1, limit: 1 }),
  });
  const waQ = useQuery({
    queryKey: ["distributor", "whatsapp-analytics"],
    queryFn: fetchWhatsappAnalytics,
  });

  const stats = useMemo(() => {
    const orders = ordersQ.data ?? [];
    const t0 = startOfToday();
    let todayCount = 0;
    let todayRev = 0;
    let pending = 0;
    for (const o of orders) {
      const ts = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      if (ts >= t0) {
        todayCount += 1;
        todayRev += Number.parseFloat(o.totalAmount) || 0;
      }
      if (o.status === "PENDING" || o.status === "PAYMENT_UPLOADED" || o.status === "PROCESSING") pending += 1;
    }
    return { total: orders.length, todayCount, todayRev, pending };
  }, [ordersQ.data]);

  const productTotal = productsQ.data?.meta?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Lightweight KPIs from live `GET /orders` and `GET /products` (first page meta for product count)."
      />
      {ordersQ.error || productsQ.error || waQ.error ? (
        <p className="text-sm text-red-600">
          {ordersQ.error instanceof ApiError
            ? ordersQ.error.message
            : productsQ.error instanceof ApiError
              ? productsQ.error.message
              : waQ.error instanceof ApiError
                ? waQ.error.message
                : "Failed to load analytics."}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-500">Orders (loaded)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-500">
            <Link className="text-emerald-700 hover:underline" to="/orders">
              View all
            </Link>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-500">Orders today</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.todayCount}</p>
          <p className="mt-1 text-xs text-slate-500">Revenue today (sum of totals)</p>
          <p className="text-sm font-medium text-slate-800">{formatInr(String(stats.todayRev))}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-500">Open pipeline</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.pending}</p>
          <p className="mt-1 text-xs text-slate-500">Pending / payment / processing</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-500">Products</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Package className="h-5 w-5 text-slate-400" aria-hidden />
            {productsQ.isLoading ? "…" : productTotal}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            <Link className="text-emerald-700 hover:underline" to="/catalog/products">
              Catalog
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden />
          WhatsApp (read-only)
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Counts from logged messages. Phone number ID is mapped by platform admin; Cloud API token stays in backend
          env only.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">Integration</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {waQ.isLoading ? "…" : waQ.data?.integrationEnabled ? "Enabled" : "Off"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">Messages sent</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {waQ.isLoading ? "…" : (waQ.data?.messagesSent ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">Messages received</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {waQ.isLoading ? "…" : (waQ.data?.messagesReceived ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium uppercase text-slate-500">Last message</p>
            <p className="mt-1 text-xs text-slate-600">
              {waQ.isLoading
                ? "…"
                : waQ.data?.lastMessageAt
                  ? `${new Date(waQ.data.lastMessageAt).toLocaleString()} · ${waQ.data.lastMessageDirection ?? ""}`
                  : "—"}
            </p>
            {waQ.data?.lastMessagePreview ? (
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{waQ.data.lastMessagePreview}</p>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm text-slate-600">
        <ShoppingCart className="h-4 w-4" aria-hidden />
        For heavy reporting, offload to replicas / warehouse per your scaling blueprint.
      </p>
    </div>
  );
}
