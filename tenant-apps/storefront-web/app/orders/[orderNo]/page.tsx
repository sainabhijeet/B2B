import type { Metadata } from "next";
import Link from "next/link";
import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import OrderPaymentSubmission from "@/components/OrderPaymentSubmission";
import OrderRequestSubmission from "@/components/OrderRequestSubmission";

type PageParams = Promise<{ orderNo: string }>;

type OrderItemRow = {
  id: string;
  variantSku: string | null;
  quantity: number;
  price: string;
  taxAmount: string;
  totalPrice: string;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMode?: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  createdAt: string;
  items?: OrderItemRow[];
  requests?: Array<{ id: string; type: string; status: string; reason: string }>;
  paymentInstructions?: {
    upiUri?: string | null;
    transactionNote?: string | null;
  };
};

type OrderDetailEnvelope = {
  success?: boolean;
  data?: OrderDetail;
  message?: string | string[];
};

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
  const res = await storefrontAuthedFetch(`/orders/${encodeURIComponent(key)}`);

  if (res.status === 401 || res.status === 403) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront"><main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("Order")}</h1>
        <p className="mt-3 text-sm text-slate-600">{t("Sign in to view this order.")}</p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("Log in")}
        </Link>
      </main></StorefrontLocaleFrame>
    );
  }

  const raw = await res.text();
  let body: OrderDetailEnvelope = {};
  try {
    body = JSON.parse(raw) as OrderDetailEnvelope;
  } catch {
    body = {};
  }

  if (!res.ok || !body.data) {
    const rawMessage = formatMessage(body.message);
    const msg = rawMessage ? t(rawMessage) : `${t("Could not load")} ${t("Order")} (${res.status}).`;
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront"><main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("Order")}</h1>
        <p className="mt-3 text-sm text-red-700">{msg}</p>
        <Link href="/orders" className="mt-8 inline-block text-sm text-indigo-600 hover:underline">
          {t("← All orders")}
        </Link>
      </main></StorefrontLocaleFrame>
    );
  }

  const o = body.data;
  const items = Array.isArray(o.items) ? o.items : [];

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront"><main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("Order")}</p>
          <h1 className="font-mono text-2xl font-semibold text-slate-900">{o.orderNumber}</h1>
          <p className="mt-1 text-sm text-slate-600">{new Date(o.createdAt).toLocaleString(language)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold uppercase text-slate-700">{o.status}</p>
          <p className="text-slate-500">{t("Payment")}: {o.paymentStatus}</p>
          {o.paymentMode ? <p className="text-slate-500">{t("Mode")}: {o.paymentMode}</p> : null}
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">{t("Item")}</th>
              <th className="px-4 py-2 text-right">{t("Qty")}</th>
              <th className="px-4 py-2 text-right">{t("Price")}</th>
              <th className="px-4 py-2 text-right">{t("Line total")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-slate-800">{it.variantSku ?? t("Not available")}</td>
                <td className="px-4 py-3 text-right text-slate-700">{it.quantity}</td>
                <td className="px-4 py-3 text-right text-slate-700">{t("INR")} {Number(it.price).toLocaleString(language)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {t("INR")} {Number(it.totalPrice).toLocaleString(language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-6 space-y-1 text-sm">
        <div className="flex justify-between text-slate-600">
          <dt>{t("Subtotal")}</dt>
          <dd className="font-medium text-slate-900">{t("INR")} {Number(o.subtotal).toLocaleString(language)}</dd>
        </div>
        <div className="flex justify-between text-slate-600">
          <dt>{t("Tax")}</dt>
          <dd className="font-medium text-slate-900">{t("INR")} {Number(o.taxAmount).toLocaleString(language)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
          <dt>{t("Total")}</dt>
          <dd>{t("INR")} {Number(o.totalAmount).toLocaleString(language)}</dd>
        </div>
      </dl>

      <OrderPaymentSubmission
        orderId={o.id}
        orderNumber={o.orderNumber}
        mode={o.paymentMode ?? ""}
        amount={o.totalAmount}
        status={o.paymentStatus}
        upiUri={o.paymentInstructions?.upiUri}
        transactionNote={o.paymentInstructions?.transactionNote}
        languageCode={language}
      />

      <OrderRequestSubmission
        orderId={o.id}
        orderStatus={o.status}
        hasPendingRequest={(o.requests ?? []).some((request) =>
          ["REQUESTED", "UNDER_REVIEW", "APPROVED", "REPLACEMENT_SHIPPED"].includes(request.status),
        )}
        languageCode={language}
      />

      <p className="mt-10 flex flex-wrap gap-4">
        <Link href="/orders" className="text-sm text-indigo-600 hover:underline">
          {t("← All orders")}
        </Link>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          {t("Home")}
        </Link>
      </p>
    </main></StorefrontLocaleFrame>
  );
}
