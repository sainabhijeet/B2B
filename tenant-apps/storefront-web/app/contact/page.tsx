'use client';

import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import StorefrontLocaleFrame from '@/components/StorefrontLocaleFrame';
import { translate } from '@/lib/translation-engine';
import Header from '@/sections/Header';

export default function ContactPage() {
  const [languageCode, setLanguageCode] = useState('en');
  const t = useCallback(
    (text: string) => translate(text, languageCode),
    [languageCode],
  );
  const nameId = useId();
  const emailId = useId();
  const subjectId = useId();
  const messageId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void fetch('/api/v1/themes/storefront/current', { cache: 'no-store' })
      .then(
        (res) =>
          res.json() as Promise<{
            data?: { selectedLanguageCode?: string };
          }>,
      )
      .then((body) =>
        setLanguageCode(body.data?.selectedLanguageCode || 'en'),
      )
      .catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/storefront/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      if (!res.ok) {
        const detail = Array.isArray(body.message)
          ? body.message.join(' ')
          : body.message;
        setError(
          detail ? t(detail) : `${t('Request failed')} (${res.status})`,
        );
        return;
      }
      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setError(t('Network error.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <StorefrontLocaleFrame
      languageCode={languageCode}
      className="theme-storefront"
    >
      <div className="min-h-screen bg-slate-50">
        <Header
          logoText="MarketPro"
          industryName={t('Contact')}
          nav={['Home', 'Categories', 'Products', 'Blog', 'FAQ']}
          languageCode={languageCode}
        />
        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[0.9fr_1.1fr]">
          <section>
            <h1 className="text-3xl font-bold text-slate-950">
              {t('Contact Support')}
            </h1>
            <p className="mt-2 leading-7 text-slate-600">
              {t(
                'Get help for buyer orders, account access, payments, delivery, and partnerships.',
              )}
            </p>
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-950">
                {t('Send your message using this form.')}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {t('It will be delivered to this store’s support team.')}
              </p>
            </div>
          </section>
          <form
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={submit}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label htmlFor={nameId} className="grid gap-1 text-sm">
                {t('Name')}
                <input
                  id={nameId}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={255}
                  required
                  className="rounded-lg border border-slate-200 px-4 py-3"
                />
              </label>
              <label htmlFor={emailId} className="grid gap-1 text-sm">
                {t('Email')}
                <input
                  id={emailId}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  maxLength={255}
                  required
                  className="rounded-lg border border-slate-200 px-4 py-3"
                />
              </label>
              <label
                htmlFor={subjectId}
                className="grid gap-1 text-sm md:col-span-2"
              >
                {t('Subject')}
                <input
                  id={subjectId}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={255}
                  required
                  className="rounded-lg border border-slate-200 px-4 py-3"
                />
              </label>
              <label
                htmlFor={messageId}
                className="grid gap-1 text-sm md:col-span-2"
              >
                {t('Message')}
                <textarea
                  id={messageId}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  minLength={10}
                  maxLength={5000}
                  required
                  className="min-h-32 rounded-lg border border-slate-200 px-4 py-3"
                />
              </label>
            </div>
            {error ? (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {error}
              </p>
            ) : null}
            {success ? (
              <p role="status" className="mt-4 text-sm text-emerald-700">
                {t('Your message has been sent to the store support team.')}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {busy ? t('Sending…') : t('Send message')}
            </button>
          </form>
        </main>
      </div>
    </StorefrontLocaleFrame>
  );
}
