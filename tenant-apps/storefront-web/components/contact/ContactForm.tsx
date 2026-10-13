"use client";

import { FormEvent, useCallback, useId, useState } from "react";
import { translate } from "@/lib/translation-engine";

export default function ContactForm({ languageCode }: { languageCode: string }) {
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
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
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

  return (
    <section id="contact-form" className="bg-slate-50 px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-primary)]">{t("Customer support")}</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">{t("Send us a message")}</h2>
          <p className="mt-3 max-w-md leading-7 text-slate-600">{t("Get help for buyer orders, account access, payments, delivery, and partnerships.")}</p>
        </div>
        <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label htmlFor={nameId} className="grid gap-1.5 text-sm font-medium text-slate-700">
              {t("Name")}
              <input id={nameId} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={255} required className="rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/15" />
            </label>
            <label htmlFor={emailId} className="grid gap-1.5 text-sm font-medium text-slate-700">
              {t("Email")}
              <input id={emailId} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={255} required className="rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/15" />
            </label>
            <label htmlFor={subjectId} className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
              {t("Subject")}
              <input id={subjectId} value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={255} required className="rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/15" />
            </label>
            <label htmlFor={messageId} className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
              {t("Message")}
              <textarea id={messageId} value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} required className="min-h-36 rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/15" />
            </label>
          </div>
          {error ? <p role="alert" className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
          {success ? <p role="status" className="mt-4 text-sm font-medium text-emerald-700">{t("Your message has been sent to the store support team.")}</p> : null}
          <button type="submit" disabled={busy} className="mt-5 rounded-lg bg-[var(--theme-primary)] px-6 py-3 font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? t("Sending…") : t("Send message")}
          </button>
        </form>
      </div>
    </section>
  );
}
