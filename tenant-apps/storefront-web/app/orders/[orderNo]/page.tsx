import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CreditCard, MapPin, Package, ReceiptText, ShieldCheck } from "lucide-react";
import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";
import RefreshCustomerSession from "@/components/auth/RefreshCustomerSession";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import { orderDateTime, orderMoney, orderPaymentLabel } from "@/lib/order-display";
import { productImageUrl } from "@/lib/product-image-url";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import OrderProductImage from "@/components/orders/OrderProductImage";
import OrderPaymentSubmission from "@/components/OrderPaymentSubmission";
import OrderRazorpayPayment from "@/components/OrderRazorpayPayment";
import OrderRequestSubmission from "@/components/OrderRequestSubmission";
import type { StorefrontMeEnvelope } from "@/lib/checkout-types";

type PageParams = Promise<{ orderNo: string }>;

type OrderItemRow = {
  id: string;
  variantSku: string | null;
  quantity: number;
  price: string;
  taxAmount: string;
  totalPrice: string;
  product?: { id: string; name: string; slug: string; thumbnailUrl?: string | null } | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMode?: string;
  subtotal: string;
  taxAmount: string;
  discountAmount?: string | null;
  couponCode?: string | null;
  totalAmount: string;
  shippingAddressId?: string | null;
  createdAt: string;
  items?: OrderItemRow[];
  requests?: Array<{ id: string; type: string; status: string; reason: string }>;
  paymentInstructions?: { upiUri?: string | null; transactionNote?: string | null };
};

type OrderDetailEnvelope = { data?: OrderDetail; message?: string | string[] };

function formatMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.filter((x) => typeof x === "string").join(", ");
  return "";
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { orderNo } = await params;
  return { title: `Order ${orderNo}` };
}

export default async function OrderDetailPage({ params }: { params: PageParams }) {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  const { orderNo } = await params;
  const key = decodeURIComponent(orderNo);
  const [res, meRes] = await Promise.all([
    storefrontAuthedFetchReadOnly(`/orders/${encodeURIComponent(key)}`),
    storefrontAuthedFetchReadOnly("/storefront/customer/me"),
  ]);

  if (res.status === 401 || res.status === 403) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <RefreshCustomerSession enabled={res.status === 401}>
          <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-slate-900">{t("Order")}</h1>
          <p className="mt-3 text-sm text-slate-600">{t("Sign in to view this order.")}</p>
          <Link href="/login?next=%2Forders" className="mt-8 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">{t("Log in")}</Link>
          </main>
        </RefreshCustomerSession>
      </StorefrontLocaleFrame>
    );
  }

  const raw = await res.text();
  let body: OrderDetailEnvelope = {};
  try { body = JSON.parse(raw) as OrderDetailEnvelope; } catch { body = {}; }

  if (!res.ok || !body.data) {
    const rawMessage = formatMessage(body.message);
    const message = rawMessage ? t(rawMessage) : `${t("Could not load")} ${t("Order")} (${res.status}).`;
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-slate-900">{t("Order")}</h1>
          <p className="mt-3 text-sm text-red-700">{message}</p>
          <Link href="/orders" className="mt-8 inline-block text-sm text-indigo-600 hover:underline">{t("Back to all orders")}</Link>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  const order = body.data;
  const items = Array.isArray(order.items) ? order.items : [];
  const me = meRes.ok ? ((await meRes.json().catch(() => null)) as StorefrontMeEnvelope | null)?.data : null;
  const address = me?.addresses?.find((entry) => entry.id === order.shippingAddressId);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const discount = Number(order.discountAmount ?? 0);

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="min-h-[70vh] bg-slate-50/80 pb-20">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-indigo-700">{t("Home")}</Link><span aria-hidden="true">/</span>
            <Link href="/orders" className="hover:text-indigo-700">{t("Your orders")}</Link><span aria-hidden="true">/</span>
            <span className="font-medium text-slate-800">{order.orderNumber}</span>
          </nav>

          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-700"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("All orders")}</Link>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("Order details")}</h1>
              <p className="mt-2 text-sm text-slate-600">{t("Order")} <span className="font-mono font-semibold text-slate-900">{order.orderNumber}</span> <span className="mx-1 text-slate-300">·</span> {orderDateTime(order.createdAt, language)}</p>
            </div>
            <Link href="/category" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:text-indigo-700">{t("Continue shopping")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>

          <section className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label={t("Order status")}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><Package className="h-6 w-6" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Current order status")}</p>
              <div className="mt-1.5"><OrderStatusBadge status={order.status} languageCode={language} /></div>
            </div>
            <div className="w-full border-t border-slate-100 pt-4 sm:w-auto sm:border-l sm:border-t-0 sm:py-1 sm:pl-6">
              <p className="text-xs text-slate-500">{t("Payment status")}</p>
              <div className="mt-1.5"><OrderStatusBadge status={order.paymentStatus} languageCode={language} /></div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="min-w-0 space-y-6">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-5 sm:px-6">
                  <h2 className="text-lg font-bold text-slate-950">{t("Items in your order")}</h2>
                  <span className="text-sm text-slate-500">{itemCount} {t(itemCount === 1 ? "item" : "items")}</span>
                </div>
                {items.length ? (
                  <ul className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <li key={item.id} className="flex gap-4 px-5 py-5 sm:px-6">
                        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:h-24 sm:w-24">
                          <OrderProductImage src={productImageUrl(item.product?.thumbnailUrl)} alt={item.product?.name ?? t("Product")} sizes="96px" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:justify-between sm:gap-5">
                          <div className="min-w-0">
                            {item.product?.slug ? <Link href={`/product/${encodeURIComponent(item.product.slug)}`} className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900 hover:text-indigo-700 hover:underline sm:text-base">{item.product.name}</Link> : <p className="text-sm font-semibold text-slate-900">{item.product?.name || item.variantSku || t("Product")}</p>}
                            {item.variantSku ? <p className="mt-1 text-xs text-slate-500">{t("SKU")}: {item.variantSku}</p> : null}
                            <p className="mt-2 text-xs text-slate-600">{t("Quantity")}: <span className="font-semibold text-slate-900">{item.quantity}</span> <span className="mx-1 text-slate-300">·</span> {t("Unit price")}: {orderMoney(item.price, language)}</p>
                          </div>
                          <div className="mt-2 shrink-0 sm:mt-0 sm:text-right"><p className="text-sm font-bold text-slate-950 sm:text-base">{orderMoney(item.totalPrice, language)}</p><p className="mt-1 text-xs text-slate-500">{t("Including tax")}</p></div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="px-6 py-8 text-sm text-slate-500">{t("Item details are not available for this order.")}</p>}
              </section>

              <div className="grid gap-6 sm:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-950"><MapPin className="h-5 w-5 text-indigo-600" aria-hidden="true" />{t("Delivery address")}</h2>
                  {address ? <div className="mt-4 text-sm leading-6 text-slate-700"><p className="font-semibold text-slate-900">{address.label || me?.name || t("Delivery")}</p><p>{address.line1}</p>{address.line2 ? <p>{address.line2}</p> : null}<p>{address.city}, {address.state} {address.pincode}</p></div> : <p className="mt-4 text-sm leading-6 text-slate-500">{order.shippingAddressId ? t("Saved address details are no longer available in your profile.") : t("No delivery address was selected for this order.")}</p>}
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-950"><CreditCard className="h-5 w-5 text-indigo-600" aria-hidden="true" />{t("Payment details")}</h2>
                  <p className="mt-4 text-xs text-slate-500">{t("Payment method")}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{t(orderPaymentLabel(order.paymentMode))}</p>
                  <p className="mt-4 text-xs text-slate-500">{t("Payment status")}</p>
                  <div className="mt-1.5"><OrderStatusBadge status={order.paymentStatus} languageCode={language} /></div>
                </section>
              </div>

              <OrderPaymentSubmission orderId={order.id} orderNumber={order.orderNumber} mode={order.paymentMode ?? ""} amount={order.totalAmount} status={order.paymentStatus} upiUri={order.paymentInstructions?.upiUri} transactionNote={order.paymentInstructions?.transactionNote} languageCode={language} />
              <OrderRazorpayPayment orderId={order.id} orderNumber={order.orderNumber} mode={order.paymentMode ?? ""} status={order.paymentStatus} orderStatus={order.status} languageCode={language} customerName={me?.name} customerPhone={me?.mobile} customerEmail={me?.email} />
              <OrderRequestSubmission orderId={order.id} orderStatus={order.status} hasPendingRequest={(order.requests ?? []).some((request) => ["REQUESTED", "UNDER_REVIEW", "APPROVED", "REPLACEMENT_SHIPPED"].includes(request.status))} languageCode={language} />
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-950"><ReceiptText className="h-5 w-5 text-indigo-600" aria-hidden="true" />{t("Order summary")}</h2>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-3 text-slate-600"><dt>{t("Items subtotal")}</dt><dd className="font-medium text-slate-900">{orderMoney(order.subtotal, language)}</dd></div>
                  <div className="flex justify-between gap-3 text-slate-600"><dt>{t("GST / tax")}</dt><dd className="font-medium text-slate-900">{orderMoney(order.taxAmount, language)}</dd></div>
                  {discount > 0 ? <div className="flex justify-between gap-3 text-emerald-700"><dt>{t("Discount")}{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="font-medium">−{orderMoney(discount, language)}</dd></div> : null}
                  <div className="flex justify-between gap-3 border-t border-slate-200 pt-4 text-base font-bold text-slate-950"><dt>{t("Total paid / payable")}</dt><dd>{orderMoney(order.totalAmount, language)}</dd></div>
                </dl>
                {order.paymentStatus !== "VERIFIED" ? <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{t("Payment has not been verified yet. Check the payment status before paying again.")}</p> : null}
              </section>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /><p>{t("Order and payment status shown here come from your store account.")}</p></div>
            </aside>
          </div>
        </div>
      </main>
    </StorefrontLocaleFrame>
  );
}
