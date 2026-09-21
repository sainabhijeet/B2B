import type { Metadata } from "next";
import Link from "next/link";
import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your order history",
};

type OrderRow = {
  id: string;
  orderNumber: string;
  totalAmount: string;
  status: string;
  createdAt: string;
};

type MePayload = {
  id: string;
  name: string;
  creditLimit?: string;
  creditBalance?: string;
};

export default async function OrdersPage() {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  const [ordersRes, meRes] = await Promise.all([
    storefrontAuthedFetch("/orders"),
    storefrontAuthedFetch("/storefront/customer/me"),
  ]);

  if (ordersRes.status === 401 || ordersRes.status === 403) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront"><main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("Orders")}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {t("Sign in with your registered mobile number to see orders for this store.")}
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("Log in")}
        </Link>
        <p className="mt-6">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            {t("← Back to store")}
          </Link>
        </p>
      </main></StorefrontLocaleFrame>
    );
  }

  let me: MePayload | null = null;
  if (meRes.ok) {
    const m = (await meRes.json()) as { data?: MePayload };
    me = m.data ?? null;
  }

  if (!ordersRes.ok) {
    const errorBody = await ordersRes.text();
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront"><main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("Orders")}</h1>
        <p className="mt-3 text-sm text-red-700">{t("Could not load orders")} ({ordersRes.status}).</p>
        <pre className="mt-4 max-h-40 overflow-auto rounded bg-slate-50 p-2 text-left text-xs text-slate-600">{errorBody}</pre>
        <Link href="/" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">
          {t("← Home")}
        </Link>
      </main></StorefrontLocaleFrame>
    );
  }

  const envelope = (await ordersRes.json()) as { success?: boolean; data?: OrderRow[] };
  const rows = Array.isArray(envelope.data) ? envelope.data : [];

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront"><main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("Your orders")}</h1>
          {me ? (
            <p className="mt-1 text-sm text-slate-600">
              {t("Signed in as")} <span className="font-medium text-slate-800">{me.name}</span>
              {me.creditLimit != null && me.creditBalance != null ? (
                <span className="ml-2 text-slate-500">
                  {t("Credit")} {me.creditBalance} / {me.creditLimit}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <form action="/api/storefront/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("Log out")}
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-600">{t("No orders yet.")}</p>
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {rows.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${encodeURIComponent(o.orderNumber)}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900">{o.orderNumber}</p>
                  <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString(language)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">{t("INR")} {Number(o.totalAmount).toLocaleString(language)}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{o.status}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          {t("← Back to store")}
        </Link>
      </p>
    </main></StorefrontLocaleFrame>
  );
}
