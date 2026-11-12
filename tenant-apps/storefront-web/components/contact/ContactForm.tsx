"use client";

import Link from "next/link";
import { FormEvent, useCallback, useId, useState } from "react";
import { translate } from "@/lib/translation-engine";

type Props = {
  languageCode: string;
  storeName?: string;
  variant?: "standard" | "coatcraft" | "materialbridge";
};

export default function ContactForm({ languageCode, storeName = "Store support", variant = "standard" }: Props) {
  const t = useCallback((text: string) => translate(text, languageCode), [languageCode]);
  const nameId = useId();
  const emailId = useId();
  const subjectId = useId();
  const messageId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch("/api/storefront/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      if (!response.ok) {
        const detail = Array.isArray(body.message) ? body.message.join(" ") : body.message;
        setError(detail ? t(detail) : `${t("Request failed")} (${response.status})`);
        return;
      }
      setSuccess(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setError(t("Network error."));
    } finally {
      setBusy(false);
    }
  }

  const formFields = (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <label htmlFor={nameId} className="grid gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
          {t("Your name")}
          <input id={nameId} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={255} required placeholder={t("Full name")} className="min-h-[52px] border border-slate-300 bg-white px-4 py-3 text-[15px] font-medium normal-case tracking-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0879ad] focus:ring-4 focus:ring-[#0879ad]/10" />
        </label>
        <label htmlFor={emailId} className="grid gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
          {t("Work email")}
          <input id={emailId} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={255} required placeholder={t("name@company.com")} className="min-h-[52px] border border-slate-300 bg-white px-4 py-3 text-[15px] font-medium normal-case tracking-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0879ad] focus:ring-4 focus:ring-[#0879ad]/10" />
        </label>
        <label htmlFor={subjectId} className="grid gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 sm:col-span-2">
          {t("What do you need help with?")}
          <select id={subjectId} value={subject} onChange={(event) => setSubject(event.target.value)} required className="min-h-[52px] border border-slate-300 bg-white px-4 py-3 text-[15px] font-medium normal-case tracking-normal text-slate-950 outline-none transition focus:border-[#0879ad] focus:ring-4 focus:ring-[#0879ad]/10">
            <option value="">{t("Select an enquiry type")}</option>
            <option value="Product selection">{t("Product selection")}</option>
            <option value="Bulk order enquiry">{t("Bulk order enquiry")}</option>
            <option value="Order and delivery support">{t("Order and delivery support")}</option>
            <option value="Account and payment support">{t("Account and payment support")}</option>
            <option value="Other enquiry">{t("Other enquiry")}</option>
          </select>
        </label>
        <label htmlFor={messageId} className="grid gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 sm:col-span-2">
          {t("Tell us about your requirement")}
          <textarea id={messageId} value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} required placeholder={t("Include the product, quantity, delivery location and any timing requirements.")} className="min-h-40 resize-y border border-slate-300 bg-white px-4 py-3 text-[15px] font-medium normal-case leading-7 tracking-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0879ad] focus:ring-4 focus:ring-[#0879ad]/10" />
        </label>
      </div>
      {error ? <p role="alert" className="mt-5 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {success ? <p role="status" className="mt-5 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{t("Your message has been sent to the store support team.")}</p> : null}
      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-5 text-slate-500">{t("By sending this request, you are asking the store support team to review the details you provide.")}</p>
        <button type="submit" disabled={busy} className="inline-flex min-h-[52px] items-center justify-center gap-4 bg-[#0879ad] px-7 py-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#05648f] focus:outline-none focus:ring-4 focus:ring-[#0879ad]/20 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? t("Sending…") : t("Send request")} <span aria-hidden="true">→</span>
        </button>
      </div>
    </>
  );

  if (variant === "materialbridge") {
    const routingTopics = [
      ["SPEC", "Material selection", "Application, grade and compliance guidance"],
      ["VOL", "Quantity planning", "Pack format, MOQ and volume requirements"],
      ["ORD", "Order support", "Payment, dispatch and delivery enquiries"],
    ];
    const preparationItems = [
      "Application or intended use",
      "Preferred grade or technical requirement",
      "Pack format and required quantity",
      "Delivery city and required timeline",
    ];

    return (
      <main className="material-contact-page" data-contact-variant="material-sourcing-desk">
        <section className="material-contact-hero">
          <div className="material-contact-hero-shell">
            <div className="material-contact-intro">
              <p>{t("TECHNICAL SOURCING DESK / MB-16")}</p>
              <h1>{t("Bring the requirement. We will map the material route.")}</h1>
              <span>{t("Share the use case, grade, pack and quantity you need. The MaterialBridge team can route your request to product guidance, bulk sourcing or order support.")}</span>
              <div>
                <a href="#material-request">{t("Open request sheet")} <span aria-hidden="true">&#8595;</span></a>
                <Link href="/category">{t("Browse material index")} <span aria-hidden="true">&#8599;</span></Link>
              </div>
            </div>

            <aside className="material-contact-router" aria-label={t("Request routing matrix")}>
              <header><span>{t("REQUEST ROUTING MATRIX")}</span><b>{t("LIVE DESK")}</b></header>
              <div>
                {routingTopics.map(([code, title, copy]) => (
                  <section key={code}>
                    <strong>{code}</strong>
                    <div><h2>{t(title)}</h2><p>{t(copy)}</p></div>
                    <span aria-hidden="true">&#8594;</span>
                  </section>
                ))}
              </div>
              <footer><span>{t("RECEIVE")}</span><i /><span>{t("CLASSIFY")}</span><i /><span>{t("ROUTE")}</span></footer>
            </aside>
          </div>
        </section>

        <section id="material-request" className="material-contact-intake">
          <aside className="material-contact-preparation">
            <p>{t("BEFORE YOU SEND")}</p>
            <h2>{t("Four details create a clearer sourcing brief.")}</h2>
            <ol>
              {preparationItems.map((item, index) => (
                <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{t(item)}</strong></li>
              ))}
            </ol>
            <div><small>{t("ROUTED TO")}</small><strong>{storeName}</strong><span>{t("Your request goes directly to the store support team for review.")}</span></div>
          </aside>

          <div className="material-contact-sheet">
            <header>
              <div><p>{t("REQUIREMENT INTAKE SHEET")}</p><h2>{t("Tell us what must be sourced.")}</h2></div>
              <dl><div><dt>{t("Form")}</dt><dd>MB-16</dd></div><div><dt>{t("Status")}</dt><dd>{t("Ready")}</dd></div></dl>
            </header>
            <p>{t("Complete the technical and commercial details below. The support team will receive the enquiry in the same structured record.")}</p>
            <form className="material-contact-form" onSubmit={submit}>{formFields}</form>
          </div>
        </section>

        <section className="material-contact-quick-routes">
          <header><p>{t("NOT READY TO SEND?")}</p><h2>{t("Use the sourcing tools before opening a request.")}</h2></header>
          <div>
            <Link href="/category"><span>INDEX</span><strong>{t("Compare material families")}</strong><b aria-hidden="true">&#8599;</b></Link>
            <Link href="/buying-guide"><span>GUIDE</span><strong>{t("Follow the qualification path")}</strong><b aria-hidden="true">&#8594;</b></Link>
            <Link href="/bulk-orders"><span>RFQ</span><strong>{t("Plan a volume requirement")}</strong><b aria-hidden="true">&#8594;</b></Link>
          </div>
        </section>
      </main>
    );
  }

  if (variant === "coatcraft") {
    const helpTopics = [
      { label: "Product guidance", copy: "Choose the right coating, finish or adhesive system." },
      { label: "Bulk requirements", copy: "Share quantities, pack needs and delivery timing." },
      { label: "Order support", copy: "Get help with an existing order or delivery question." },
    ];
    const preparationItems = [
      "Product name, category or application",
      "Required quantity or pack size",
      "Delivery city and preferred timing",
    ];

    return (
      <main className="overflow-hidden bg-[#edf5f8] text-[#08283d]" data-contact-variant="coatcraft">
        <section className="relative isolate overflow-hidden bg-[#062f45] text-white">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-[#0a729f] lg:block" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border-[70px] border-white/[0.06]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-[1480px] lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
            <div className="px-6 py-14 sm:px-10 sm:py-16 lg:px-16 lg:py-20 xl:px-20">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#77c5e8]">{t("Trade support desk")}</p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-[58px]">{t("Let’s solve your coating requirement together.")}</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">{t("Tell us what you are sourcing, where it will be used and how much you need. The buying team can review your request and help identify the right next step.")}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#contact-request" className="inline-flex min-h-12 items-center gap-4 bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#062f45] transition hover:bg-[#e5f5fb]">{t("Send a request")} <span aria-hidden="true">↓</span></a>
                <Link href="/category" className="inline-flex min-h-12 items-center gap-4 border border-white/35 px-6 py-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:border-white hover:bg-white/10">{t("Browse products")} <span aria-hidden="true">→</span></Link>
              </div>
            </div>
            <aside className="relative bg-[#0a729f] px-6 py-12 sm:px-10 lg:px-12 lg:py-16 xl:px-16" aria-label={t("Support topics")}>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#d5f3ff]">{t("How we can help")}</p>
              <div className="mt-6 divide-y divide-white/20 border-y border-white/20">
                {helpTopics.map((topic, index) => (
                  <div key={topic.label} className="grid grid-cols-[44px_1fr] gap-4 py-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 text-[11px] font-black">0{index + 1}</span>
                    <div><h2 className="text-base font-black">{t(topic.label)}</h2><p className="mt-1 text-sm leading-6 text-[#d8eff8]">{t(topic.copy)}</p></div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section id="contact-request" className="mx-auto grid max-w-[1320px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-10 lg:py-20">
          <aside className="self-start bg-[#dcecf2] p-7 sm:p-8 lg:sticky lg:top-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Before you send")}</p>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.025em]">{t("A little detail helps us respond more clearly.")}</h2>
            <ul className="mt-7 space-y-5">
              {preparationItems.map((item, index) => (
                <li key={item} className="grid grid-cols-[34px_1fr] items-start gap-3 text-sm font-semibold leading-6 text-slate-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#0879ad]">{String(index + 1).padStart(2, "0")}</span><span className="pt-1">{t(item)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-[#b9d5df] pt-6">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#062f45]">{t("Store support")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t(`Your request will be sent directly to the ${storeName} support team.`)}</p>
            </div>
          </aside>
          <div className="bg-white p-6 shadow-[0_24px_70px_rgba(6,47,69,0.10)] sm:p-9 lg:p-12">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Contact form")}</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">{t("Share your requirement")}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{t("Complete the form below and the store support team will receive your enquiry for review.")}</p>
            </div>
            <form onSubmit={submit}>{formFields}</form>
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-5 pb-14 sm:px-8 lg:px-10 lg:pb-20">
          <div className="grid gap-6 border-t border-[#bfd7e0] py-8 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0879ad]">{t("Still comparing?")}</p><h2 className="mt-2 text-xl font-black sm:text-2xl">{t("Use the catalogue and buying guide before you send your request.")}</h2></div>
            <div className="flex flex-wrap gap-3">
              <Link href="/category" className="inline-flex min-h-11 items-center border border-[#87b8cc] bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.08em] text-[#062f45] transition hover:border-[#0879ad]">{t("Browse catalogue")}</Link>
              <Link href="/buying-guide" className="inline-flex min-h-11 items-center bg-[#062f45] px-5 py-3 text-xs font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#0a4865]">{t("Read buying guide")}</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <section id="contact-form" className="bg-slate-50 px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-primary)]">{t("Customer support")}</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">{t("Send us a message")}</h2>
          <p className="mt-3 max-w-md leading-7 text-slate-600">{t("Get help for buyer orders, account access, payments, delivery, and partnerships.")}</p>
        </div>
        <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={submit}>{formFields}</form>
      </div>
    </section>
  );
}
