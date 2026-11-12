"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
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

function normalizeMobileNumber(value: string): string {
  const digits = value.replace(/\D/gu, "");
  if (digits.length > 10) return digits.slice(-10);
  return digits;
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

function contrastForHex(value: string): string {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/iu);
  if (!match) return "#ffffff";
  const expanded =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((character) => character + character)
          .join("")
      : match[1];
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 156 ? "#111827" : "#ffffff";
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
  const mobileInput = useRef<HTMLInputElement>(null);
  const otpInput = useRef<HTMLInputElement>(null);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  const mobileDigits = normalizeMobileNumber(mobile);
  const otpDigits = code.replace(/\D/gu, "").slice(0, 6);
  const brandPrimary = primaryColor?.trim() || "#d97706";
  const brandSecondary = secondaryColor?.trim() || "#1c1917";
  const brandContrast = contrastForHex(brandPrimary);
  const cleanLogoUrl = logoImageUrl?.trim() || "";
  const loginStyle = {
    "--login-primary": brandPrimary,
    "--login-secondary": brandSecondary,
    "--login-contrast": brandContrast,
    backgroundImage:
      "radial-gradient(circle at 9% 16%, color-mix(in srgb, var(--login-primary) 13%, transparent) 0, transparent 29%), radial-gradient(circle at 92% 86%, color-mix(in srgb, var(--login-secondary) 10%, transparent) 0, transparent 32%)",
  } as CSSProperties;

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

  useEffect(() => {
    if (step !== "mobile") return;

    const syncAutofilledMobile = () => {
      const nextMobile = normalizeMobileNumber(mobileInput.current?.value ?? "");
      setMobile((currentMobile) =>
        normalizeMobileNumber(currentMobile) === nextMobile ? currentMobile : nextMobile,
      );
    };

    syncAutofilledMobile();
    const interval = window.setInterval(syncAutofilledMobile, 250);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 3000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [step]);

  async function requestOtp() {
    const submittedMobile = normalizeMobileNumber(mobileInput.current?.value ?? mobileDigits);
    setMobile(submittedMobile);

    if (submittedMobile.length !== 10) {
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
        body: JSON.stringify({ mobile: submittedMobile }),
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
        `${t("OTP sent to")} +91 ${submittedMobile}. ${t("It expires in")} ${otpExpiryMinutes(payload)} ${t("minutes")}.`,
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
    <main
      className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#f2efe9] px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
      style={loginStyle}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(15,23,42,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.035)_1px,transparent_1px)] [background-size:52px_52px]"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-44 -right-24 h-[28rem] w-[28rem] rounded-full bg-[color-mix(in_srgb,var(--login-primary)_12%,transparent)] blur-3xl"
      />

      <div className="relative mx-auto grid min-w-0 w-full max-w-[1160px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_40px_120px_-38px_rgba(15,23,42,0.42)] lg:grid-cols-[1.08fr_0.92fr]">
        <section
          className="relative hidden min-h-[680px] flex-col justify-between overflow-hidden p-11 text-white lg:flex xl:p-14"
          style={{
            backgroundColor: brandSecondary,
            backgroundImage:
              "linear-gradient(145deg, color-mix(in srgb, var(--login-secondary) 92%, #071115) 0%, color-mix(in srgb, var(--login-primary) 72%, var(--login-secondary)) 68%, var(--login-primary) 135%)",
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom_right,black,transparent_78%)]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-36 top-14 h-80 w-80 rounded-full border border-white/15"
          />

          <Link
            href="/"
            className="relative inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white/80 backdrop-blur-sm transition hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("Back to store")}
          </Link>

          <div className="relative max-w-[500px] py-7">
            <div className="mb-9 inline-flex h-16 w-[220px] items-center overflow-hidden rounded-xl border border-white/30 bg-white p-2.5 shadow-[0_16px_40px_-20px_rgba(0,0,0,.7)]">
              {cleanLogoUrl ? (
                <Image
                  src={cleanLogoUrl}
                  alt={`${storeName} logo`}
                  width={220}
                  height={64}
                  unoptimized
                  className="h-full w-full object-contain object-left"
                />
              ) : (
                <span className="text-xl font-black text-slate-950">{storeName}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-white/55" />
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/65">
                {t("Retailer access")}
              </p>
            </div>
            <h2 className="mt-6 max-w-[11ch] text-[3.35rem] font-black leading-[0.98] tracking-[-0.055em] xl:text-[3.9rem]">
              {t("Welcome back to")} {storeName}
            </h2>
            <p className="mt-7 max-w-md text-[15px] leading-7 text-white/70">
              {tagline?.trim() ||
                t("Sign in securely to browse trade pricing, manage orders and restock faster.")}
            </p>
          </div>

          <div className="relative grid grid-cols-3 border-y border-white/15 py-5">
            {[
              [t("Trade pricing"), t("Live rates")],
              [t("Fast ordering"), t("Easy repeat")],
              [t("Secure access"), t("OTP login")],
            ].map(([label, detail], index) => (
              <div
                key={label}
                className={`min-w-0 px-4 first:pl-0 ${index > 0 ? "border-l border-white/15" : ""}`}
              >
                <span className="mb-3 flex h-6 w-6 items-center justify-center rounded-full border border-white/25 bg-white/10">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <p className="truncate text-sm font-bold">{label}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/50">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex min-h-[650px] min-w-0 flex-col justify-center bg-[color-mix(in_srgb,var(--login-primary)_2.5%,white)] px-6 py-9 sm:px-11 lg:px-12 xl:px-16">
          <div aria-hidden="true" className="absolute right-0 top-0 h-1 w-28 bg-[var(--login-primary)]" />
          <div className="mb-10 flex items-center justify-between gap-4 lg:hidden">
            <Link
              href="/"
              aria-label={t("Back to store")}
              className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="flex h-12 w-[180px] items-center justify-end overflow-hidden rounded-xl bg-white p-1.5 sm:w-[200px]">
              {cleanLogoUrl ? (
                <Image
                  src={cleanLogoUrl}
                  alt={`${storeName} logo`}
                  width={200}
                  height={56}
                  unoptimized
                  className="h-full w-full object-contain object-right"
                />
              ) : (
                <span className="text-lg font-black text-slate-950">{storeName}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--login-primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--login-primary)_8%,white)] px-3 py-1.5 text-xs font-bold text-[var(--login-primary)]">
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              {t("Secure retailer sign in")}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {step === "mobile" ? "01 / 02" : "02 / 02"}
            </span>
          </div>
          <h1 className="mt-7 max-w-[12ch] break-words text-[2.55rem] font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-[3rem]">
            {step === "mobile" ? t("Enter your mobile number") : t("Verify your OTP")}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
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
              className="mt-9 min-w-0 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void requestOtp();
              }}
              noValidate
            >
              <label htmlFor={mobileId} className="block text-[13px] font-black text-slate-800">
                {t("Mobile number")}
                <span className="mt-2.5 flex min-h-[62px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-22px_rgba(15,23,42,.45)] transition focus-within:border-[var(--login-primary)] focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--login-primary)_12%,transparent)]">
                  <span className="flex items-center gap-2.5 border-r border-slate-200 bg-slate-50/80 px-4 text-sm font-black text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    +91
                  </span>
                  <input
                    ref={mobileInput}
                    id={mobileId}
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base font-bold text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    enterKeyHint="next"
                    pattern="[0-9]{10}"
                    maxLength={14}
                    value={mobileDigits}
                    onInput={(event) => setMobile(normalizeMobileNumber(event.currentTarget.value))}
                    onChange={(event) => setMobile(normalizeMobileNumber(event.currentTarget.value))}
                    aria-invalid={Boolean(error)}
                    placeholder="9876543210"
                    autoFocus
                  />
                </span>
              </label>
              <button
                type="submit"
                disabled={busy !== null}
                style={{
                  backgroundImage: `linear-gradient(110deg, ${brandPrimary}, color-mix(in srgb, ${brandPrimary} 72%, ${brandSecondary}))`,
                  color: brandContrast,
                }}
                className="flex min-h-[60px] w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-black shadow-[0_16px_32px_-18px_var(--login-primary)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {busy === "send" ? t("Sending OTP…") : t("Send OTP")}
              </button>
            </form>
          ) : (
            <form
              className="mt-9 min-w-0 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void verifyOtp();
              }}
              noValidate
            >
              <label htmlFor={otpId} className="block text-[13px] font-black text-slate-800">
                {t("6-digit OTP")}
                <input
                  ref={otpInput}
                  id={otpId}
                  className="mt-2.5 min-h-[62px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xl font-black tracking-[0.42em] text-slate-950 shadow-[0_12px_30px_-22px_rgba(15,23,42,.45)] outline-none transition focus:border-[var(--login-primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--login-primary)_12%,transparent)]"
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
                style={{
                  backgroundImage: `linear-gradient(110deg, ${brandPrimary}, color-mix(in srgb, ${brandPrimary} 72%, ${brandSecondary}))`,
                  color: brandContrast,
                }}
                className="flex min-h-[60px] w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-black shadow-[0_16px_32px_-18px_var(--login-primary)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {busy === "verify" ? t("Signing in…") : t("Verify & continue")}
              </button>
              <div className="flex items-center justify-between gap-4 text-sm">
                <button
                  type="button"
                  className="font-semibold text-slate-500 hover:text-slate-950 disabled:opacity-50"
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
                  className="font-black hover:brightness-75"
                  onClick={changeMobile}
                  disabled={busy !== null}
                >
                  {t("Change mobile")}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 text-sm text-slate-500 shadow-[0_14px_34px_-28px_rgba(15,23,42,.55)]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <ShieldCheck className="h-[18px] w-[18px] text-emerald-600" aria-hidden="true" />
            </span>
            <p className="min-w-0 break-words leading-5">
              <span className="font-black text-slate-800">{t("Your account is protected.")}</span>{" "}
              {t("We only use your mobile number to verify your retailer account.")}
            </p>
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-slate-200/80 pt-5 text-[11px] uppercase tracking-[0.08em] text-slate-400">
            <span className="inline-flex min-w-0 items-center gap-2 font-bold">
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{storeName}</span>
            </span>
            <Link
              href="/"
              className="font-black text-slate-500 transition hover:text-slate-950 lg:hidden"
            >
              {t("Back to store")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
