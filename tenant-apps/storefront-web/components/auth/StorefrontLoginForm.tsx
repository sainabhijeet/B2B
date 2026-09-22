"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { translate } from "@/lib/translation-engine";

const DEVICE_STORAGE_KEY = "storefront_customer_device_id";
const RESEND_DELAY_SECONDS = 30;

type ApiPayload = {
  message?: string | string[];
  error?: string | string[];
  developmentCode?: string;
  expiresInMinutes?: number;
  data?: {
    developmentCode?: string;
    expiresInMinutes?: number;
  };
};

function apiMessage(payload: ApiPayload | null, fallback: string): string {
  for (const value of [payload?.message, payload?.error]) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const joined = value.filter(Boolean).join(" ").trim();
      if (joined) return joined;
    }
  }
  return fallback;
}

function developmentCode(payload: ApiPayload | null): string {
  const value = payload?.developmentCode ?? payload?.data?.developmentCode ?? "";
  return /^\d{6}$/u.test(value) ? value : "";
}

function otpExpiryMinutes(payload: ApiPayload | null): number {
  const value = payload?.expiresInMinutes ?? payload?.data?.expiresInMinutes;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 5;
}

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return createDeviceId();
  const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY)?.trim();
  if (existing && existing.length <= 128) return existing;
  const created = createDeviceId();
  window.localStorage.setItem(DEVICE_STORAGE_KEY, created);
  return created;
}

export default function StorefrontLoginForm({
  languageCode,
  nextPath,
}: {
  languageCode: string;
  nextPath: string;
}) {
  const router = useRouter();
  const t = (text: string) => translate(text, languageCode);
  const mobileId = useId();
  const otpId = useId();
  const otpInput = useRef<HTMLInputElement>(null);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  const mobileDigits = mobile.replace(/\D/gu, "").slice(0, 10);
  const otpDigits = code.replace(/\D/gu, "").slice(0, 6);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (step === "otp") otpInput.current?.focus();
  }, [step]);

  async function requestOtp() {
    if (mobileDigits.length !== 10) {
      setError(t("Enter a valid 10-digit mobile number."));
      return;
    }

    setBusy("send");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/storefront/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ mobile: mobileDigits }),
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload | null;
      if (!response.ok) {
        setError(t(apiMessage(payload, `Could not send OTP (${response.status}).`)));
        return;
      }

      const devCode = developmentCode(payload);
      setCode(process.env.NODE_ENV === "development" ? devCode : "");
      setStep("otp");
      setResendSeconds(RESEND_DELAY_SECONDS);
      setNotice(
        `${t("OTP sent to")} +91 ${mobileDigits}. ${t("It expires in")} ${otpExpiryMinutes(payload)} ${t("minutes")}.`,
      );
    } catch {
      setError(t("Network error. Please check your connection and try again."));
    } finally {
      setBusy(null);
    }
  }

  async function verifyOtp() {
    if (otpDigits.length !== 6) {
      setError(t("Enter the complete 6-digit OTP."));
      return;
    }

    setBusy("verify");
    setError("");
    try {
      const response = await fetch("/api/storefront/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          mobile: mobileDigits,
          code: otpDigits,
          deviceId: getOrCreateDeviceId(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload | null;
      if (!response.ok) {
        setError(t(apiMessage(payload, `Could not verify OTP (${response.status}).`)));
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(t("Network error. Please check your connection and try again."));
    } finally {
      setBusy(null);
    }
  }

  function changeMobile() {
    setStep("mobile");
    setCode("");
    setError("");
    setNotice("");
    setResendSeconds(0);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <span aria-hidden="true" className="text-xl font-black">R</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-950">
          {t("Enter your mobile number")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("Please confirm your country code and enter your phone number.")}
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}
        {notice ? (
          <div
            role="status"
            className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
          </div>
        ) : null}

        {step === "mobile" ? (
          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void requestOtp();
            }}
            noValidate
          >
            <label htmlFor={mobileId} className="block text-sm font-semibold text-slate-800">
              {t("Mobile number")}
              <span className="mt-2 flex overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                  +91
                </span>
                <input
                  id={mobileId}
                  className="min-w-0 flex-1 px-3 py-3 text-base font-medium outline-none"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  enterKeyHint="next"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  value={mobileDigits}
                  onChange={(event) => setMobile(event.target.value.replace(/\D/gu, ""))}
                  aria-invalid={Boolean(error)}
                  placeholder="9876543210"
                  autoFocus
                />
              </span>
            </label>
            <button
              type="submit"
              disabled={busy !== null || mobileDigits.length !== 10}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "send" ? t("Sending OTP…") : t("Send OTP")}
            </button>
          </form>
        ) : (
          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void verifyOtp();
            }}
            noValidate
          >
            <label htmlFor={otpId} className="block text-sm font-semibold text-slate-800">
              {t("6-digit OTP")}
              <input
                ref={otpInput}
                id={otpId}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                inputMode="numeric"
                autoComplete="one-time-code"
                enterKeyHint="done"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otpDigits}
                onChange={(event) => setCode(event.target.value.replace(/\D/gu, ""))}
                aria-invalid={Boolean(error)}
              />
            </label>
            <button
              type="submit"
              disabled={busy !== null || otpDigits.length !== 6}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "verify" ? t("Signing in…") : t("Verify & continue")}
            </button>
            <div className="flex items-center justify-between gap-4 text-sm">
              <button
                type="button"
                className="font-medium text-slate-600 hover:text-slate-950 disabled:opacity-50"
                onClick={() => void requestOtp()}
                disabled={busy !== null || resendSeconds > 0}
              >
                {resendSeconds > 0
                  ? `${t("Resend OTP in")} ${resendSeconds}s`
                  : t("Resend OTP")}
              </button>
              <button
                type="button"
                className="font-medium text-indigo-700 hover:text-indigo-900"
                onClick={changeMobile}
                disabled={busy !== null}
              >
                {t("Change mobile")}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
          <Link href="/" className="mt-3 inline-block text-sm text-slate-500 hover:text-slate-900">
            {t("Back to store")}
          </Link>
        </div>
      </section>
    </main>
  );
}
