"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  Phone,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
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

type StorefrontLoginFormProps = {
  languageCode: string;
  nextPath: string;
  storeName: string;
  logoImageUrl?: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
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
  storeName,
  logoImageUrl,
  tagline,
  primaryColor,
  secondaryColor,
}: StorefrontLoginFormProps) {
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
  const brandPrimary = primaryColor?.trim() || "#d97706";
  const brandSecondary = secondaryColor?.trim() || "#1c1917";
  const cleanLogoUrl = logoImageUrl?.trim() || "";

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
    <main className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#fffaf7] px-4 py-8 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-orange-200/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-rose-200/40 blur-3xl"
      />

      <div className="relative mx-auto grid min-w-0 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-orange-100/80 bg-white shadow-[0_28px_90px_-32px_rgba(87,48,21,0.35)] lg:grid-cols-[1.04fr_0.96fr]">
        <section
          className="relative hidden min-h-[650px] flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-12"
          style={{
            backgroundImage: `linear-gradient(145deg, rgba(15, 23, 42, 0.68), rgba(15, 23, 42, 0.12)), linear-gradient(145deg, ${brandSecondary} 0%, ${brandPrimary} 100%)`,
          }}
        >
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/15 bg-white/5"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full border border-white/10 bg-black/5"
          />

          <Link
            href="/"
            className="relative inline-flex w-fit items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("Back to store")}
          </Link>

          <div className="relative max-w-md">
            <div className="mb-8 inline-flex h-[72px] w-[250px] items-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/10">
              {cleanLogoUrl ? (
                <Image
                  src={cleanLogoUrl}
                  alt={`${storeName} logo`}
                  width={250}
                  height={72}
                  unoptimized
                  className="h-full w-full object-cover object-left"
                />
              ) : (
                <span className="text-xl font-black text-slate-950">{storeName}</span>
              )}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/65">
              {t("Retailer access")}
            </p>
            <h2 className="mt-4 text-4xl font-black leading-[1.08] tracking-tight xl:text-5xl">
              {t("Welcome back to")} {storeName}
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-white/75">
              {tagline?.trim() ||
                t("Sign in securely to browse trade pricing, manage orders and restock faster.")}
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            {[
              [t("Trade pricing"), t("Live rates")],
              [t("Fast ordering"), t("Easy repeat")],
              [t("Secure access"), t("OTP login")],
            ].map(([label, detail]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm"
              >
                <Check className="mb-3 h-4 w-4" aria-hidden="true" />
                <p className="text-sm font-bold">{label}</p>
                <p className="mt-1 text-xs text-white/60">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[620px] min-w-0 flex-col justify-center px-6 py-8 sm:px-10 lg:px-12 xl:px-14">
          <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
            <Link
              href="/"
              aria-label={t("Back to store")}
              className="rounded-full border border-slate-200 p-2.5 text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="flex h-12 w-[160px] items-center justify-end overflow-hidden rounded-xl bg-white sm:w-[190px]">
              {cleanLogoUrl ? (
                <Image
                  src={cleanLogoUrl}
                  alt={`${storeName} logo`}
                  width={190}
                  height={56}
                  unoptimized
                  className="h-full w-full object-cover object-left"
                />
              ) : (
                <span className="text-lg font-black text-slate-950">{storeName}</span>
              )}
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-800">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            {t("Secure retailer sign in")}
          </div>
          <h1 className="mt-5 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {step === "mobile" ? t("Enter your mobile number") : t("Verify your OTP")}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
            {step === "mobile"
              ? t("Please confirm your country code and enter your phone number.")
              : `${t("We sent a 6-digit code to")} +91 ${mobileDigits}.`}
          </p>

          {error ? (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          ) : null}
          {notice ? (
            <div
              role="status"
              className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
            >
              {notice}
            </div>
          ) : null}

          {step === "mobile" ? (
            <form
              className="mt-8 min-w-0 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void requestOtp();
              }}
              noValidate
            >
              <label htmlFor={mobileId} className="block text-sm font-bold text-slate-800">
                {t("Mobile number")}
                <span className="mt-2 flex min-h-14 overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-100">
                  <span className="flex items-center gap-2 border-r border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    +91
                  </span>
                  <input
                    id={mobileId}
                    className="min-w-0 flex-1 px-4 py-3 text-base font-semibold text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400"
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
                style={{ backgroundColor: brandPrimary }}
                className="flex min-h-14 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-900/10 transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
              >
                {busy === "send" ? t("Sending OTP…") : t("Send OTP")}
              </button>
            </form>
          ) : (
            <form
              className="mt-8 min-w-0 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void verifyOtp();
              }}
              noValidate
            >
              <label htmlFor={otpId} className="block text-sm font-bold text-slate-800">
                {t("6-digit OTP")}
                <input
                  ref={otpInput}
                  id={otpId}
                  className="mt-2 min-h-14 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl font-black tracking-[0.4em] text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
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
                style={{ backgroundColor: brandPrimary }}
                className="flex min-h-14 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-900/10 transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
              >
                {busy === "verify" ? t("Signing in…") : t("Verify & continue")}
              </button>
              <div className="flex items-center justify-between gap-4 text-sm">
                <button
                  type="button"
                  className="font-semibold text-slate-600 hover:text-slate-950 disabled:opacity-50"
                  onClick={() => void requestOtp()}
                  disabled={busy !== null || resendSeconds > 0}
                >
                  {resendSeconds > 0
                    ? `${t("Resend OTP in")} ${resendSeconds}s`
                    : t("Resend OTP")}
                </button>
                <button
                  type="button"
                  style={{ color: brandPrimary }}
                  className="font-bold hover:brightness-75"
                  onClick={changeMobile}
                  disabled={busy !== null}
                >
                  {t("Change mobile")}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3.5 text-sm text-slate-600">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <p className="min-w-0 break-words leading-5">
              <span className="font-bold text-slate-800">{t("Your account is protected.")}</span>{" "}
              {t("We only use your mobile number to verify your retailer account.")}
            </p>
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              {storeName}
            </span>
            <Link
              href="/"
              className="font-bold text-slate-600 transition hover:text-slate-950 lg:hidden"
            >
              {t("Back to store")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
