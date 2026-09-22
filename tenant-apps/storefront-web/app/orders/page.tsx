import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Package, ShoppingBag } from "lucide-react";
import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";
import RefreshCustomerSession from "@/components/auth/RefreshCustomerSession";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import { orderDateTime, orderMoney, orderPaymentLabel } from "@/lib/order-display";
import { productImageUrl } from "@/lib/product-image-url";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import OrderProductImage from "@/components/orders/OrderProductImage";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your order history",
};

type OrderRow = {
  id: string;
  orderNumber: string;
  totalAmount: string;
  status: string;
  paymentStatus?: string;
  paymentMode?: string;
  createdAt: string;
  itemCount?: number;
  unitCount?: number;
  previewItems?: Array<{ name: string; quantity: number; thumbnailUrl: string | null }>;
};

type MePayload = { id: string; name: string; creditBalance?: string; creditLimit?: string };

export default async function OrdersPage() {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  const [ordersRes, meRes] = await Promise.all([
    storefrontAuthedFetchReadOnly("/orders?includePreviews=true"),
    storefrontAuthedFetchReadOnly("/storefront/customer/me"),
  ]);

  if (ordersRes.status === 401 || ordersRes.status === 403) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <RefreshCustomerSession enabled={ordersRes.status === 401}>
          <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-slate-900">{t("Orders")}</h1>
          <p className="mt-3 text-sm text-slate-600">{t("Sign in with your registered mobile number to see orders for this store.")}</p>
          <Link href="/login?next=%2Forders" className="mt-8 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">{t("Log in")}</Link>
          <p className="mt-6"><Link href="/" className="text-sm text-indigo-600 hover:underline">{t("Back to store")}</Link></p>
          </main>
        </RefreshCustomerSession>
      </StorefrontLocaleFrame>
    );
  }

  if (!ordersRes.ok) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-slate-900">{t("Orders")}</h1>
          <p className="mt-3 text-sm text-red-700">{t("Could not load orders")} ({ordersRes.status}).</p>
          <Link href="/" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">{t("Back to store")}</Link>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  const envelope = (await ordersRes.json()) as { data?: OrderRow[]; meta?: { total?: number } };
  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  const total = envelope.meta?.total ?? rows.length;
  const me = meRes.ok ? ((await meRes.json().catch(() => null)) as { data?: MePayload } | null)?.data : null;

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="min-h-[70vh] bg-slate-50/80 pb-20">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-indigo-700">{t("Home")}</Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-slate-800">{t("Your orders")}</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">{t("My account")}</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("Your orders")}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {total} {t(total === 1 ? "order" : "orders")}
                {me ? <> <span className="mx-1.5 text-slate-300">·</span> {t("Signed in as")} <span className="font-medium text-slate-800">{me.name}</span></> : null}
                {me?.creditBalance != null && me.creditLimit != null ? <> <span className="mx-1.5 text-slate-300">·</span> {t("Credit")}: {orderMoney(me.creditBalance, language)} / {orderMoney(me.creditLimit, language)}</> : null}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/product" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" /> {t("Continue shopping")}
              </Link>
              <form action="/api/storefront/auth/logout" method="post">
                <button type="submit" className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">{t("Log out")}</button>
              </form>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Package className="h-8 w-8" aria-hidden="true" /></span>
              <h2 className="mt-5 text-xl font-semibold text-slate-900">{t("No orders yet")}</h2>
              <p className="mt-2 text-sm text-slate-500">{t("Products you order will appear here.")}</p>
              <Link href="/product" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">{t("Browse products")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {rows.map((o) => {
                const paymentPending = o.paymentStatus === "PENDING" && o.paymentMode === "RAZORPAY" && o.status === "PENDING";
                const cover = o.previewItems?.find((item) => productImageUrl(item.thumbnailUrl));
                return (
                  <li key={o.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                    <Link href={`/orders/${encodeURIComponent(o.orderNumber)}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" aria-label={`${t("View order")} ${o.orderNumber}`}>
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-600">
                            <OrderProductImage src={productImageUrl(cover?.thumbnailUrl)} alt={cover?.name ?? t("Product")} sizes="40px" className="object-contain p-0.5" />
                          </span>
                          <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("Order number")}</p><p className="font-mono text-sm font-bold text-slate-900">{o.orderNumber}</p></div>
                        </div>
                        <OrderStatusBadge status={o.status} languageCode={language} />
                      </div>
                      {o.previewItems?.length ? (
                        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {o.previewItems.map((item, index) => (
                              <div key={`${o.id}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50/80 p-2">
                                <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                  <OrderProductImage src={productImageUrl(item.thumbnailUrl)} alt={item.name} sizes="64px" />
                                </span>
                                <span className="min-w-0"><span className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{item.name}</span><span className="mt-1 block text-xs text-slate-500">{t("Qty")}: {item.quantity}</span></span>
                              </div>
                            ))}
                          </div>
                          {(o.itemCount ?? 0) > o.previewItems.length ? <p className="mt-3 text-xs font-medium text-slate-500">+{(o.itemCount ?? 0) - o.previewItems.length} {t("more products in this order")}</p> : null}
                        </div>
                      ) : null}
                      <div className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                        <div className="grid gap-4 text-sm sm:grid-cols-2">
                          <div><p className="text-xs text-slate-500">{t("Placed on")}</p><p className="mt-1 font-medium text-slate-800">{orderDateTime(o.createdAt, language)}</p></div>
                          <div><p className="text-xs text-slate-500">{t("Payment method")}</p><p className="mt-1 font-medium text-slate-800">{t(orderPaymentLabel(o.paymentMode))}</p></div>
                          {paymentPending ? <p className="text-xs font-medium text-amber-700 sm:col-span-2">{t("Online payment pending · Open order to pay")}</p> : null}
                        </div>
                        <div className="flex items-center justify-between gap-5 border-t border-slate-100 pt-4 sm:block sm:border-0 sm:pt-0 sm:text-right">
                          <div><p className="text-xs text-slate-500">{t("Order total")}</p><p className="mt-1 text-lg font-bold text-slate-950">{orderMoney(o.totalAmount, language)}</p></div>
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700">{t("View details")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("Back to store")}</Link>
        </div>
      </main>
    </StorefrontLocaleFrame>
  );
}
