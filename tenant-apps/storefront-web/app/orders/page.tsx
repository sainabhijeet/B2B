import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Package, ShoppingBag, Truck } from "lucide-react";
import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";
import RefreshCustomerSession from "@/components/auth/RefreshCustomerSession";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import { orderDateTime, orderMoney, orderPaymentLabel } from "@/lib/order-display";
import { productImageUrl } from "@/lib/product-image-url";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import OrderProductImage from "@/components/orders/OrderProductImage";
import { resolveStorefrontTheme } from "@/lib/resolve-storefront-theme";

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
  const [language, resolved, ordersRes, meRes] = await Promise.all([
    getStorefrontLanguage(),
    resolveStorefrontTheme(),
    storefrontAuthedFetchReadOnly("/orders?includePreviews=true"),
    storefrontAuthedFetchReadOnly("/storefront/customer/me"),
  ]);
  const t = (text: string) => translate(text, language);
  const isMaterialBridgeTheme = resolved.storefrontKey === "chemicals-specialty-materials-web-theme";

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

  if (isMaterialBridgeTheme) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="material-orders-page" data-orders-layout="material-movement-register">
          <div className="material-orders-shell">
            <nav aria-label="Breadcrumb" className="material-orders-breadcrumb">
              <Link href="/">{t("Home")}</Link><span aria-hidden="true">/</span><strong>{t("Material movement register")}</strong>
            </nav>

            <section className="material-orders-ledger-head">
              <div className="material-orders-ledger-title">
                <p>{t("BUYER RECORD / ORDER CONTROL")}</p>
                <h1>{t("Material movement register")}</h1>
                <span>{t("One record for every confirmed material order, commercial release and dispatch update.")}</span>
              </div>

              <dl className="material-orders-ledger-meta">
                <div><dt>{t("Open register")}</dt><dd>{String(total).padStart(2, "0")} {t(total === 1 ? "order" : "orders")}</dd></div>
                <div><dt>{t("Buyer account")}</dt><dd>{me?.name ?? t("Signed-in buyer")}</dd></div>
                <div><dt>{t("Credit record")}</dt><dd>{me?.creditBalance != null && me.creditLimit != null ? `${orderMoney(me.creditBalance, language)} / ${orderMoney(me.creditLimit, language)}` : t("Available at checkout")}</dd></div>
              </dl>

              <div className="material-orders-ledger-actions">
                <Link href="/category">{t("Open material index")} <span aria-hidden="true">&#8599;</span></Link>
                <form action="/api/storefront/auth/logout" method="post"><button type="submit">{t("Log out")}</button></form>
              </div>
            </section>

            {rows.length === 0 ? (
              <section className="material-orders-empty">
                <div className="material-orders-empty-copy">
                  <div className="material-orders-seal" aria-hidden="true"><span>MB</span><small>ORDER<br />REGISTER</small></div>
                  <p>{t("REGISTER STATUS / CLEAR")}</p>
                  <h2>{t("No material releases logged yet.")}</h2>
                  <span>{t("Start with a chemical family, verify grade and pack information, then release the selected quantity to checkout. Your confirmed order dossier will appear here.")}</span>
                  <div className="material-orders-empty-actions">
                    <Link href="/category">{t("Browse material families")} <ArrowRight aria-hidden="true" /></Link>
                    <Link href="/bulk-orders">{t("Build a bulk RFQ")} <span aria-hidden="true">&#8599;</span></Link>
                  </div>
                </div>

                <aside className="material-orders-protocol">
                  <header><span>{t("RELEASE PROTOCOL")}</span><small>{t("What this register will capture")}</small></header>
                  <ol>
                    {[
                      ["01", "Material confirmed", "Product, grade, pack format and ordered quantity"],
                      ["02", "Commercial release", "Payment record, payable total and order reference"],
                      ["03", "Dispatch trace", "Fulfilment status and delivery movement"],
                    ].map(([code, title, copy]) => (
                      <li key={code}><b>{code}</b><div><strong>{t(title)}</strong><span>{t(copy)}</span></div></li>
                    ))}
                  </ol>
                  <footer><span>{t("IDENTIFY")}</span><i aria-hidden="true" /><span>{t("VERIFY")}</span><i aria-hidden="true" /><span>{t("RELEASE")}</span></footer>
                </aside>
              </section>
            ) : (
              <section className="material-orders-register">
                <header><span>{t("ORDER DOSSIERS")}</span><strong>{t("Recent material movements")}</strong><small>{t("Select a reference to review its complete commercial and dispatch record.")}</small></header>
                <ul className="material-orders-ledger-list">
                  {rows.map((o) => {
                    const paymentPending = o.paymentStatus === "PENDING" && o.paymentMode === "RAZORPAY" && o.status === "PENDING";
                    const cover = o.previewItems?.find((item) => productImageUrl(item.thumbnailUrl));
                    return (
                      <li key={o.id} className="material-order-row">
                        <Link href={`/orders/${encodeURIComponent(o.orderNumber)}`} aria-label={`${t("View order")} ${o.orderNumber}`}>
                          <div className="material-order-reference">
                            <span className="material-order-image"><OrderProductImage src={productImageUrl(cover?.thumbnailUrl)} alt={cover?.name ?? t("Product")} sizes="76px" /></span>
                            <div><small>{t("ORDER REFERENCE")}</small><strong>{o.orderNumber}</strong><OrderStatusBadge status={o.status} languageCode={language} /></div>
                          </div>
                          <dl>
                            <div><dt>{t("Released")}</dt><dd>{orderDateTime(o.createdAt, language)}</dd></div>
                            <div><dt>{t("Materials")}</dt><dd>{o.itemCount ?? o.previewItems?.length ?? 0} {t("line items")}</dd></div>
                            <div><dt>{t("Payment")}</dt><dd>{t(orderPaymentLabel(o.paymentMode))}{paymentPending ? ` / ${t("Pending")}` : ""}</dd></div>
                            <div><dt>{t("Order total")}</dt><dd>{orderMoney(o.totalAmount, language)}</dd></div>
                          </dl>
                          <span className="material-order-open">{t("Open dossier")} <ArrowRight aria-hidden="true" /></span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <Link href="/account" className="material-orders-account-link"><ArrowLeft aria-hidden="true" />{t("Back to buyer account")}</Link>
          </div>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="min-h-[70vh] bg-[#f1f5f6] pb-20 text-[#092c40]">
        <div className="mx-auto max-w-[1420px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="font-semibold transition hover:text-[var(--theme-primary)]">{t("Home")}</Link>
            <span aria-hidden="true">/</span>
            <span className="font-bold text-[#092c40]">{t("Your orders")}</span>
          </nav>

          <section className="relative overflow-hidden rounded-[30px] bg-[#082f45] px-5 py-7 text-white shadow-[0_22px_55px_rgba(6,47,69,0.15)] sm:px-8 sm:py-9 lg:px-10">
            <span className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full border-[48px] border-[#0c5c7c]/35" aria-hidden="true" />
            <span className="pointer-events-none absolute bottom-0 left-10 h-1 w-32 bg-[#1aa4d5]" aria-hidden="true" />

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4 sm:items-center sm:gap-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1595c6] shadow-lg sm:h-16 sm:w-16"><Package className="h-7 w-7" aria-hidden="true" /></span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#76d2f3]">{t("Order tracking workspace")}</p>
                  <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{t("Your orders")}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/65">
                    <span>{total} {t(total === 1 ? "order" : "orders")}</span>
                    {me ? <><span className="h-1 w-1 rounded-full bg-white/35" aria-hidden="true" /><span>{t("Account")}: <b className="text-white/90">{me.name}</b></span></> : null}
                    {me?.creditBalance != null && me.creditLimit != null ? <><span className="h-1 w-1 rounded-full bg-white/35" aria-hidden="true" /><span>{t("Credit used")}: {orderMoney(me.creditBalance, language)} / {orderMoney(me.creditLimit, language)}</span></> : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/category" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#082f45] shadow-lg transition hover:bg-[#e9f6fb]"><ShoppingBag className="h-4 w-4" aria-hidden="true" />{t("Browse catalogue")}</Link>
                <form action="/api/storefront/auth/logout" method="post"><button type="submit" className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white">{t("Log out")}</button></form>
              </div>
            </div>
          </section>

          {rows.length === 0 ? (
            <section className="mt-7 overflow-hidden rounded-[26px] border border-[#d4e1e5] bg-white shadow-[0_16px_42px_rgba(6,47,69,0.06)]">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_440px]">
                <div className="flex min-h-[360px] flex-col justify-center p-7 sm:p-10 lg:p-12">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f2f7] text-[var(--theme-primary)]"><ShoppingBag className="h-6 w-6" aria-hidden="true" /></span>
                  <p className="mt-7 text-[10px] font-black uppercase tracking-[0.19em] text-[var(--theme-primary)]">{t("Ready when you are")}</p>
                  <h2 className="mt-2 max-w-xl text-3xl font-black tracking-[-0.04em] text-[#092c40]">{t("Your first order starts with the right coating system.")}</h2>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">{t("Browse products for everyday requirements or share a larger requirement with the buying desk. Confirmed orders and their progress will appear here.")}</p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link href="/category" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 py-3 text-sm font-black text-white shadow-[0_10px_25px_rgba(8,121,173,0.22)] transition hover:brightness-95">{t("Browse products")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                    <Link href="/bulk-orders" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#c7d9df] bg-white px-5 py-3 text-sm font-bold text-[#163d50] transition hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]">{t("Plan a bulk order")}</Link>
                  </div>
                </div>

                <div className="border-t border-[#d8e4e8] bg-[#edf5f7] p-7 sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.19em] text-[#527484]">{t("After you place an order")}</p>
                  <ol className="mt-7 space-y-6">
                    {[
                      [ClipboardCheck, "Order confirmed", "Review products, quantities and payment details"],
                      [CheckCircle2, "Prepared for dispatch", "The seller confirms availability and fulfilment"],
                      [Truck, "Delivery progress", "Follow shipment updates from your account"],
                    ].map(([Icon, title, copy], index) => {
                      const StepIcon = Icon as typeof Package;
                      return (
                        <li key={String(title)} className="relative flex gap-4">
                          {index < 2 ? <span className="absolute left-5 top-10 h-10 w-px bg-[#bcd3dc]" aria-hidden="true" /> : null}
                          <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--theme-primary)] shadow-sm"><StepIcon className="h-4 w-4" /></span>
                          <div className="pt-0.5"><p className="text-sm font-black text-[#092c40]">{t(String(title))}</p><p className="mt-1 text-xs leading-5 text-slate-500">{t(String(copy))}</p></div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            </section>
          ) : (
            <ul className="mt-7 space-y-5">
              {rows.map((o) => {
                const paymentPending = o.paymentStatus === "PENDING" && o.paymentMode === "RAZORPAY" && o.status === "PENDING";
                const cover = o.previewItems?.find((item) => productImageUrl(item.thumbnailUrl));
                return (
                  <li key={o.id} className="overflow-hidden rounded-[22px] border border-[#d4e1e5] bg-white shadow-[0_12px_34px_rgba(6,47,69,0.05)] transition hover:border-[#9fc6d5] hover:shadow-[0_18px_44px_rgba(6,47,69,0.09)]">
                    <Link href={`/orders/${encodeURIComponent(o.orderNumber)}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-primary)]" aria-label={`${t("View order")} ${o.orderNumber}`}>
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dce7ea] bg-[#f2f7f8] px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#d2e0e5] bg-white text-[#4a7082]">
                            <OrderProductImage src={productImageUrl(cover?.thumbnailUrl)} alt={cover?.name ?? t("Product")} sizes="40px" className="object-contain p-0.5" />
                          </span>
                          <div><p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">{t("Order number")}</p><p className="mt-0.5 font-mono text-sm font-black text-[#092c40]">{o.orderNumber}</p></div>
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
                          <span className="inline-flex items-center gap-1 text-sm font-black text-[var(--theme-primary)]">{t("View details")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link href="/account" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-[var(--theme-primary)]"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("Back to account")}</Link>
        </div>
      </main>
    </StorefrontLocaleFrame>
  );
}
