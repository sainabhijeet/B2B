"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { translate } from "@/lib/translation-engine";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";

function randomDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function StorefrontLoginPage() {
  const [languageCode, setLanguageCode] = useState("en");
  const t = useCallback((text: string) => translate(text, languageCode), [languageCode]);
  useEffect(() => {
    void fetch("/api/v1/themes/storefront/current", { cache: "no-store" })
      .then((res) => res.json() as Promise<{ data?: { selectedLanguageCode?: string } }>)
      .then((body) => setLanguageCode(body.data?.selectedLanguageCode || "en"))
      .catch(() => undefined);
  }, []);
  const router = useRouter();
  const mobileId = useId();
  const otpId = useId();
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [deviceId] = useState(randomDeviceId);
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/storefront/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.replace(/\D/g, "") }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(body.message ? t(body.message) : `${t("Request failed")} (${res.status})`);
        return;
      }
      setStep("otp");
    } catch {
      setError(t("Network error."));
    } finally {
      setBusy(false);
    }
  }, [mobile, t]);

  const verify = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/storefront/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: mobile.replace(/\D/g, ""),
          code: code.replace(/\D/g, "").slice(0, 6),
          deviceId,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(body.message ? t(body.message) : `${t("Verify failed")} (${res.status})`);
        return;
      }
      router.push("/orders");
      router.refresh();
    } catch {
      setError(t("Network error."));
    } finally {
      setBusy(false);
    }
  }, [mobile, code, deviceId, router, t]);

  return (
    <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront"><main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold text-slate-900">{t("Retailer sign in")}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {t("Use the mobile number registered for your account at this store. OTP is sent via the platform SMS provider.")}
      </p>
      {process.env.NODE_ENV === "development" ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Dev: open this store on <span className="font-mono">{'{tenant}'}.localhost:5175</span> matching{" "}
          <span className="font-mono">tenants.slug</span>. Seed test customer from backend{" "}
          <code className="rounded bg-amber-100 px-0.5">npm run storefront:test-customer:seed</code> (default mobile{" "}
          <span className="font-mono">
            {process.env.NEXT_PUBLIC_STOREFRONT_TEST_MOBILE?.trim() || "9999999999"}
          </span>
          , tenant <span className="font-mono">acme-retail</span>). Tap Send OTP, then use{" "}
          <span className="font-mono">000000</span> when fixed OTP is on (
          <span className="font-mono">OTP_FIXED_CODE_ENABLED</span> / non-production).
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {step === "mobile" ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void requestOtp();
          }}
        >
          <div>
            <label htmlFor={mobileId} className="block text-xs font-medium text-slate-700">
              {t("Mobile (digits only, 8–20)")}
            </label>
            <input
              id={mobileId}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              inputMode="numeric"
              autoComplete="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? t("Sending…") : t("Send OTP")}
          </button>
        </form>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <div>
            <label htmlFor={otpId} className="block text-xs font-medium text-slate-700">
              {t("6-digit OTP")}
            </label>
            <input
              id={otpId}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm tracking-widest"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? t("Signing in…") : t("Verify & continue")}
          </button>
          <button
            type="button"
            className="w-full text-xs text-slate-500 hover:text-slate-800"
            onClick={() => {
              setStep("mobile");
              setCode("");
            }}
          >
            {t("Change mobile")}
          </button>
        </form>
      )}
      <p className="mt-8 text-center text-xs text-slate-500">
        <Link href="/" className="text-indigo-600 hover:underline">
          {t("Back to store")}
        </Link>
      </p>
    </main></StorefrontLocaleFrame>
  );
}
