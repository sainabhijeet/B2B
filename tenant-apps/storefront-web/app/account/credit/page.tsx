import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ReceiptText, WalletCards } from "lucide-react";
import RefreshCustomerSession from "@/components/auth/RefreshCustomerSession";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import type { ApiEnvelope, CustomerProfile } from "@/lib/account-types";
import type { CreditLedgerEnvelope, CreditTransaction } from "@/lib/credit-types";
import { formatCurrency, formatDate } from "@/lib/language-consistency";
import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import { getStorefrontFeatureConfig } from "@/services/storefrontAppConfigService";

export const metadata: Metadata = {
  title: "Credit ledger",
  description: "Review your trade credit statement and transaction history",
};

type SearchParams = Promise<{ page?: string | string[] }>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function money(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function transactionLabel(type: string): string {
  const labels: Record<string, string> = {
    ORDER_DEBIT: "Credit purchase",
    PAYMENT_CREDIT: "Payment received",
    ADJUSTMENT_DEBIT: "Debit adjustment",
    ADJUSTMENT_CREDIT: "Credit adjustment",
    REVERSAL: "Order reversal",
    RETURN_CREDIT: "Return credit",
    OPENING_BALANCE: "Opening balance",
    WRITE_OFF: "Balance write-off",
  };
  return labels[type] ?? type.replaceAll("_", " ").toLowerCase();
}

function referenceText(row: CreditTransaction): string {
  const kind = row.referenceType?.replaceAll("_", " ").toLowerCase() || "entry";
  if (!row.referenceId) return kind;
  return `${kind} - ${row.referenceId.slice(0, 8).toUpperCase()}`;
}

export default async function CreditLedgerPage({ searchParams }: { searchParams: SearchParams }) {
  const requestedPage = positiveInteger(first((await searchParams).page), 1);
  const [languageCode, profileResponse, ledgerResponse, featureConfig] = await Promise.all([
    getStorefrontLanguage(),
    storefrontAuthedFetchReadOnly("/storefront/customer/me"),
    storefrontAuthedFetchReadOnly(`/storefront/customer/credit-ledger?page=${requestedPage}&limit=25`),
    getStorefrontFeatureConfig(),
  ]);
  const t = (text: string) => translate(text, languageCode);
  const unauthorized = [profileResponse.status, ledgerResponse.status].some((status) => status === 401 || status === 403);

  if (unauthorized) {
    const content = (
      <main className="min-h-[55vh] bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <WalletCards className="mx-auto h-12 w-12 text-[var(--theme-primary)]" />
          <h1 className="mt-5 text-2xl font-bold text-slate-950">{t("Credit ledger")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("Sign in to view your credit statement and transaction history.")}</p>
          <Link href="/login?next=%2Faccount%2Fcredit" className="mt-7 inline-flex rounded-xl bg-[var(--theme-primary)] px-6 py-3 text-sm font-bold text-white hover:brightness-95">{t("Sign in")}</Link>
        </div>
      </main>
    );
    return (
      <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront">
        <RefreshCustomerSession enabled={profileResponse.status === 401 || ledgerResponse.status === 401}>{content}</RefreshCustomerSession>
      </StorefrontLocaleFrame>
    );
  }

  if (!featureConfig.creditViewEnabled) {
    return (
      <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront">
        <main className="mx-auto min-h-[55vh] max-w-lg px-4 py-16 text-center">
          <WalletCards className="mx-auto h-12 w-12 text-slate-400" />
          <h1 className="mt-5 text-2xl font-bold text-slate-950">{t("Credit information unavailable")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("Credit view is turned off for this store.")}</p>
          <Link href="/account" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)] hover:underline"><ArrowLeft className="h-4 w-4" />{t("Back to account")}</Link>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  if (!profileResponse.ok || !ledgerResponse.ok) {
    return (
      <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront">
        <main className="mx-auto min-h-[55vh] max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-950">{t("Credit ledger")}</h1>
          <p className="mt-3 text-sm text-red-700">{t("Could not load your credit statement. Please try again.")}</p>
          <Link href="/account" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--theme-primary)] hover:underline"><ArrowLeft className="h-4 w-4" />{t("Back to account")}</Link>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  const [profilePayload, ledgerPayload] = await Promise.all([
    profileResponse.json().catch(() => null) as Promise<ApiEnvelope<CustomerProfile> | null>,
    ledgerResponse.json().catch(() => null) as Promise<CreditLedgerEnvelope | null>,
  ]);
  const profile = profilePayload?.data;
  const transactions = Array.isArray(ledgerPayload?.data) ? ledgerPayload.data : [];

  if (!profile) {
    return (
      <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront">
        <main className="mx-auto min-h-[55vh] max-w-lg px-4 py-16 text-center text-red-700">{t("Customer profile response is invalid.")}</main>
      </StorefrontLocaleFrame>
    );
  }

  const limit = money(profile.creditLimit);
  const outstanding = money(profile.creditBalance);
  const available = Math.max(limit - outstanding, 0);
  const pageDebits = transactions.reduce((total, row) => total + Math.max(money(row.amount), 0), 0);
  const pageCredits = transactions.reduce((total, row) => total + Math.abs(Math.min(money(row.amount), 0)), 0);
  const page = positiveInteger(String(ledgerPayload?.meta?.page ?? requestedPage), requestedPage);
  const totalPages = Math.max(positiveInteger(String(ledgerPayload?.meta?.total_pages ?? 1), 1), 1);
  const totalEntries = Math.max(0, Number(ledgerPayload?.meta?.total ?? transactions.length) || 0);

  return (
    <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront">
      <main className="min-h-[65vh] bg-slate-50/80 pb-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav aria-label={t("Breadcrumb")} className="mb-6 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-[var(--theme-primary)]">{t("Home")}</Link><span>/</span>
            <Link href="/account" className="hover:text-[var(--theme-primary)]">{t("My account")}</Link><span>/</span>
            <span className="font-semibold text-slate-800">{t("Credit ledger")}</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-primary)]">{t("Trade credit")}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{t("Credit ledger and statement")}</h1>
              <p className="mt-2 text-sm text-slate-600">{t("Review purchases, payments, adjustments and your current available credit.")}</p>
            </div>
            <Link href="/account" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"><ArrowLeft className="h-4 w-4" />{t("Back to account")}</Link>
          </div>

          <section className="mt-7 grid gap-4 sm:grid-cols-3">
            <SummaryCard label={t("Credit limit")} value={formatCurrency(limit, languageCode, "INR")} />
            <SummaryCard label={t("Outstanding")} value={formatCurrency(outstanding, languageCode, "INR")} tone="amber" />
            <SummaryCard label={t("Available credit")} value={formatCurrency(available, languageCode, "INR")} tone="emerald" />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-[var(--theme-primary)]" /><div><h2 className="text-lg font-bold text-slate-950">{t("Customer statement")}</h2><p className="text-xs text-slate-500">{totalEntries} {t(totalEntries === 1 ? "transaction" : "transactions")}</p></div></div>
              <div className="flex gap-4 text-xs">
                <span className="text-slate-500">{t("Debits on this page")}: <strong className="text-amber-700">{formatCurrency(pageDebits, languageCode, "INR")}</strong></span>
                <span className="text-slate-500">{t("Credits on this page")}: <strong className="text-emerald-700">{formatCurrency(pageCredits, languageCode, "INR")}</strong></span>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
                <ReceiptText className="mx-auto h-9 w-9 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-800">{t("No credit transactions yet")}</p>
                <p className="mt-1 text-sm text-slate-500">{t("Credit purchases and payments will appear here.")}</p>
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-y border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr><th className="px-4 py-3">{t("Date")}</th><th className="px-4 py-3">{t("Description")}</th><th className="px-4 py-3">{t("Reference")}</th><th className="px-4 py-3 text-right">{t("Debit")}</th><th className="px-4 py-3 text-right">{t("Credit")}</th><th className="px-4 py-3 text-right">{t("Balance")}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((row) => {
                      const amount = money(row.amount);
                      return (
                        <tr key={row.id} className="text-slate-700 hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-4 py-3.5">{formatDate(row.createdAt, languageCode)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">{t(transactionLabel(row.type))}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs capitalize text-slate-500">{referenceText(row)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-amber-700">{amount > 0 ? formatCurrency(amount, languageCode, "INR") : "-"}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-emerald-700">{amount < 0 ? formatCurrency(Math.abs(amount), languageCode, "INR") : "-"}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-slate-950">{formatCurrency(money(row.balanceAfter), languageCode, "INR")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 ? (
              <nav aria-label={t("Statement pages")} className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                {page > 1 ? <Link href={`/account/credit?page=${page - 1}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"><ArrowLeft className="h-4 w-4" />{t("Previous")}</Link> : <span />}
                <span className="text-xs font-semibold text-slate-500">{t("Page")} {page} {t("of")} {totalPages}</span>
                {page < totalPages ? <Link href={`/account/credit?page=${page + 1}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]">{t("Next")}<ArrowRight className="h-4 w-4" /></Link> : <span />}
              </nav>
            ) : null}
          </section>
        </div>
      </main>
    </StorefrontLocaleFrame>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "amber" | "emerald" }) {
  const valueClass = tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-slate-950";
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${valueClass}`}>{value}</p></div>;
}
