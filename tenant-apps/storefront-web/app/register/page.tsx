'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import StorefrontLocaleFrame from '@/components/StorefrontLocaleFrame';
import { translate } from '@/lib/translation-engine';

export default function RegisterPage() {
  const [languageCode, setLanguageCode] = useState('en');
  const t = useCallback(
    (text: string) => translate(text, languageCode),
    [languageCode],
  );
  const companyId = useId();
  const mobileId = useId();
  const emailId = useId();
  const [companyName, setCompanyName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
    const mobileDigits = mobile.replace(/\D/g, '');
    if (mobileDigits.length < 8 || mobileDigits.length > 20) {
      setError(t('Mobile must be 8–20 digits.'));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/storefront/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          mobile: mobileDigits,
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      if (!res.ok) {
        const message = Array.isArray(body.message)
          ? body.message.join(' ')
          : body.message;
        setError(
          message ? t(message) : `${t('Request failed')} (${res.status})`,
        );
        return;
      }
      setSubmitted(true);
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
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-3xl font-bold">{t('Create retailer account')}</h1>
        {submitted ? (
          <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="font-semibold text-emerald-900">
              {t('Registration submitted')}
            </h2>
            <p className="mt-2 text-sm text-emerald-800">
              {t(
                'Your distributor will review and activate your account. You can sign in with OTP after approval.',
              )}
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-semibold text-indigo-700 underline"
            >
              {t('Go to sign in')}
            </Link>
          </section>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <label htmlFor={companyId} className="grid gap-1 text-sm">
              {t('Company name')}
              <input
                id={companyId}
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                autoComplete="organization"
                maxLength={255}
                required
                className="rounded-lg border px-4 py-3"
              />
            </label>
            <label htmlFor={mobileId} className="grid gap-1 text-sm">
              {t('Mobile number')}
              <input
                id={mobileId}
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                inputMode="numeric"
                autoComplete="tel"
                required
                className="rounded-lg border px-4 py-3"
              />
            </label>
            <label htmlFor={emailId} className="grid gap-1 text-sm">
              {t('Email (optional)')}
              <input
                id={emailId}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                maxLength={255}
                className="rounded-lg border px-4 py-3"
              />
            </label>
            {error ? (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? t('Submitting…') : t('Submit registration')}
            </button>
          </form>
        )}
        <p className="mt-5 text-sm text-slate-600">
          {t('Already have an account?')}{' '}
          <Link href="/login" className="underline">
            {t('Sign in')}
          </Link>
        </p>
      </main>
    </StorefrontLocaleFrame>
  );
}
