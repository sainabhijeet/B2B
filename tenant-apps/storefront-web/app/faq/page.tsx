import Link from "next/link";
import { ArrowRight, Headphones, PackageCheck, RotateCcw, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import ThemedContentPage from "@/components/ThemedContentPage";
import { resolveStorefrontTheme } from "@/lib/resolve-storefront-theme";

const faqs = [
  [Truck, "Delivery", "How does delivery work?", "Dispatch and delivery estimates depend on the product, seller and destination. Confirmed order updates appear in your Orders area when available."],
  [PackageCheck, "Bulk orders", "How can I place a bulk order?", "Choose the products you need, note the quantities and use the bulk-order or contact page to share delivery and timing requirements."],
  [ShieldCheck, "Payments", "Is payment secure?", "The checkout flow is designed for payment review, address confirmation and a clear order summary before submission."],
  [RotateCcw, "Returns", "How do returns work?", "Eligibility depends on the item, its condition, the seller and the reason for return. Start with the order reference and contact support promptly."],
  [PackageCheck, "Tracking", "Where can I track an order?", "Sign in and open Orders to review confirmed purchases and any tracking updates supplied for them."],
  [ShoppingCart, "Cart", "What does the cart number mean?", "The header cart badge shows the number of distinct products. Each cart line keeps its own ordered quantity."],
];

export default async function FaqPage() {
  const [language, resolved] = await Promise.all([
    getStorefrontLanguage(),
    resolveStorefrontTheme(),
  ]);
  const t = (text: string) => translate(text, language);
  const isMaterialBridgeTheme = resolved.storefrontKey === "chemicals-specialty-materials-web-theme";

  if (isMaterialBridgeTheme) {
    const indexTopics = [
      ["SELECT", "Material and pack selection"],
      ["ORDER", "Cart, payment and bulk orders"],
      ["MOVE", "Dispatch and tracking"],
      ["CARE", "Returns and buyer support"],
    ];

    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="material-faq-page" data-faq-layout="material-query-register">
          <section className="material-faq-hero">
            <div className="material-faq-hero-shell">
              <div className="material-faq-intro">
                <p>{t("MATERIAL KNOWLEDGE INDEX / MB-16")}</p>
                <h1>{t("Material questions, indexed for faster decisions.")}</h1>
                <span>{t("Review concise guidance for material selection, quantity planning, checkout, dispatch and after-order support.")}</span>
                <div>
                  <a href="#material-questions">{t("Open question register")} <span aria-hidden="true">&#8595;</span></a>
                  <Link href="/contact">{t("Ask the sourcing desk")} <span aria-hidden="true">&#8599;</span></Link>
                </div>
              </div>

              <aside className="material-faq-classifier" aria-label={t("Question classification") }>
                <header><span>{t("QUESTION CLASSIFICATION")}</span><b>{String(faqs.length).padStart(2, "0")} {t("records")}</b></header>
                <dl>
                  <div><dt>{t("Before ordering")}</dt><dd>{t("Select material, pack and quantity")}</dd><span>01</span></div>
                  <div><dt>{t("At checkout")}</dt><dd>{t("Confirm cart, payment and order")}</dd><span>02</span></div>
                  <div><dt>{t("After purchase")}</dt><dd>{t("Track movement and request support")}</dd><span>03</span></div>
                </dl>
                <footer><span>{t("SEARCH")}</span><i /><span>{t("VERIFY")}</span><i /><span>{t("ACT")}</span></footer>
              </aside>
            </div>
          </section>

          <section id="material-questions" className="material-faq-register">
            <header className="material-faq-register-head">
              <div><p>{t("BUYER QUERY REGISTER")}</p><h2>{t("Find the record that matches your next step.")}</h2></div>
              <dl><div><dt>{t("Index")}</dt><dd>MB / FAQ</dd></div><div><dt>{t("Records")}</dt><dd>{String(faqs.length).padStart(2, "0")}</dd></div><div><dt>{t("Status")}</dt><dd>{t("Current")}</dd></div></dl>
            </header>

            <div className="material-faq-register-grid">
              <aside className="material-faq-index">
                <p>{t("QUERY MAP")}</p>
                <nav aria-label={t("FAQ topics")}>
                  {indexTopics.map(([code, label]) => <a key={code} href="#faq-records"><span>{code}</span><strong>{t(label)}</strong></a>)}
                </nav>
                <div><small>{t("UNLISTED REQUIREMENT?")}</small><h3>{t("Route a specific question to the material desk.")}</h3><Link href="/contact">{t("Open a support request")} <ArrowRight aria-hidden="true" /></Link></div>
              </aside>

              <div id="faq-records" className="material-faq-records">
                {faqs.map(([, category, question, answer], index) => (
                  <details key={String(question)} open={index === 0}>
                    <summary>
                      <span className="material-faq-record-code">Q-{String(index + 1).padStart(2, "0")}</span>
                      <span className="material-faq-record-title"><small>{t(String(category))}</small><strong>{t(String(question))}</strong></span>
                      <span className="material-faq-record-toggle" aria-hidden="true">+</span>
                    </summary>
                    <div className="material-faq-answer"><span>{t("ANSWER RECORD")}</span><p>{t(String(answer))}</p></div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="material-faq-actions">
            <div><p>{t("NEED A SPECIFIC ANSWER?")}</p><h2>{t("Send the product, quantity or order reference to the sourcing desk.")}</h2></div>
            <div><Link href="/contact">{t("Contact support")} <span aria-hidden="true">&#8599;</span></Link><Link href="/buying-guide">{t("Read buying guide")} <span aria-hidden="true">&#8594;</span></Link></div>
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  const fallback = (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
    <div className="min-h-screen bg-[#f1f5f6] text-[#092c40]">
      <main>
        <section className="px-4 pt-8 sm:px-6 lg:px-10 lg:pt-10">
          <div className="relative mx-auto max-w-[1420px] overflow-hidden rounded-[30px] bg-[#082f45] px-6 py-10 text-white shadow-[0_22px_55px_rgba(6,47,69,0.15)] sm:px-9 lg:px-12 lg:py-14">
            <span className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[54px] border-[#0c5c7c]/35" aria-hidden="true" />
            <span className="pointer-events-none absolute bottom-0 left-12 h-1 w-36 bg-[#1aa4d5]" aria-hidden="true" />
            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#76d2f3]">{t("Buyer help centre")}</p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.045em] sm:text-5xl lg:text-[56px] lg:leading-[1.03]">{t("Answers for every stage of your order.")}</h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{t("Find clear guidance for product selection, larger requirements, checkout, delivery and after-order support.")}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur">
                {["Before ordering", "At checkout", "After purchase"].map((label, index) => <div key={label} className="rounded-xl bg-white/[0.06] px-3 py-4 text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-[#1698c9] text-[10px] font-black">0{index + 1}</span><p className="mt-2 text-[10px] font-bold text-white/70">{t(label)}</p></div>)}
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-[1420px] gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[330px_minmax(0,1fr)] lg:px-10 lg:py-10">
          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[24px] border border-[#d4e1e5] bg-white p-6 shadow-[0_12px_34px_rgba(6,47,69,0.05)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-primary)]">{t("Browse help topics")}</p>
              <div className="mt-5 space-y-2">
                {[[ShoppingCart, "Shopping and cart"], [ShieldCheck, "Payments and checkout"], [Truck, "Delivery and tracking"], [RotateCcw, "Returns and support"]].map(([Icon, label]) => {
                  const TopicIcon = Icon as typeof Truck;
                  return <a key={String(label)} href="#common-questions" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#163d50] transition hover:bg-[#edf5f7] hover:text-[var(--theme-primary)]"><TopicIcon className="h-4 w-4 text-[var(--theme-primary)]" />{t(String(label))}</a>;
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-[24px] bg-[#0a3a52] p-6 text-white shadow-[0_18px_44px_rgba(6,47,69,0.14)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#78d5f5]"><Headphones className="h-5 w-5" /></span>
              <h2 className="mt-5 text-xl font-black tracking-[-0.025em]">{t("Need help with a specific order?")}</h2>
              <p className="mt-2 text-xs leading-5 text-white/60">{t("Share your order reference and requirement with our buyer-support team.")}</p>
              <Link href="/contact" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-[#0a3a52] transition hover:bg-[#e9f6fb]">{t("Contact support")}<ArrowRight className="h-4 w-4" /></Link>
            </section>
          </aside>

          <div id="common-questions">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-primary)]">{t("Common questions")}</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#092c40]">{t("Quick answers, clearly explained")}</h2></div>
              <span className="rounded-full bg-[#dfecef] px-3.5 py-1.5 text-xs font-bold text-[#527484]">{faqs.length} {t("topics")}</span>
            </div>

            <div className="space-y-3">
              {faqs.map(([Icon, category, question, answer], index) => {
                const FaqIcon = Icon as typeof Truck;
                return (
                  <details key={String(question)} className="group overflow-hidden rounded-[20px] border border-[#d4e1e5] bg-white shadow-[0_8px_24px_rgba(6,47,69,0.035)] transition open:border-[#a8cbd8] open:shadow-[0_14px_34px_rgba(6,47,69,0.075)]" open={index === 0}>
                    <summary className="flex cursor-pointer list-none items-center gap-4 p-5 marker:hidden sm:p-6">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3f7] text-[var(--theme-primary)] transition group-open:bg-[var(--theme-primary)] group-open:text-white"><FaqIcon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[var(--theme-primary)]">{t(String(category))}</span><span className="mt-1 block text-base font-black text-[#092c40] sm:text-lg">{t(String(question))}</span></span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d2e1e6] text-lg font-normal text-[#527484] transition group-open:rotate-45 group-open:border-[var(--theme-primary)] group-open:text-[var(--theme-primary)]" aria-hidden="true">+</span>
                    </summary>
                    <div className="border-t border-[#e3ebee] bg-[#f7fafb] px-5 py-5 sm:pl-20 sm:pr-8"><p className="max-w-3xl text-sm leading-7 text-slate-600">{t(String(answer))}</p></div>
                  </details>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
    </StorefrontLocaleFrame>
  );
  return <ThemedContentPage page="faq" fallback={fallback} />;
}
