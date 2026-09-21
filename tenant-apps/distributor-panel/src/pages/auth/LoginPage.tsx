import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/apiClient";
import type { TenantStaffLoginResponse } from "@/lib/apiTypes";
import {
  setAuthSession,
  setDeviceId,
  setTokens,
  ensureDeviceId,
  type AuthSession,
} from "@/lib/authStorage";
import {
  DISTRIBUTOR_COUNTRY_ID_KEY,
  DISTRIBUTOR_COUNTRY_ISO_KEY,
  DISTRIBUTOR_COUNTRY_NAME_KEY,
  DISTRIBUTOR_LOGIN_PHONE_KEY,
} from "@/lib/countryIsoStorage";
import { fetchDistributorOnboardingStatus } from "@/lib/distributorOnboardingApi";
import { getRoleFromAccessToken, getTenantIdFromAccessToken } from "@/lib/jwtParse";
import {
  countryFlagEmoji,
  nationalDigitsBounds,
  parseCountriesListResponse,
  PLATFORM_NATIONAL_PHONE_LEN_MAX,
  PLATFORM_NATIONAL_PHONE_LEN_MIN,
  type PublicCountryRow,
} from "@shared/country-phone-display";

const DISTRIBUTOR_OTP_PURPOSE = "distributor_panel" as const;
const DEFAULT_DISTRIBUTOR_COUNTRY_ISO = "IN";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [publicCountries, setPublicCountries] = useState<PublicCountryRow[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [nationalPhone, setNationalPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [developmentOtp, setDevelopmentOtp] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const lastAutoOtpRef = useRef("");

  useEffect(() => {
    let active = true;
    void apiGet<{ data: AuthSession }>("/auth/session")
      .then((response) => {
        if (!active) return;
        setAuthSession(response.data);
        navigate(from.startsWith("/login") ? "/" : from, { replace: true });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [from, navigate]);

  useEffect(() => {
    let cancelled = false;
    void apiGet<unknown>("/countries", { skipAuth: true })
      .then((payload) => {
        if (!cancelled) setPublicCountries(parseCountriesListResponse(payload));
      })
      .catch(() => {
        if (!cancelled) setPublicCountries([]);
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Avoid a render where countries exist but `selectedCountryId` is still "" → input stays disabled. */
  const resolvedCountryId = useMemo(() => {
    if (!publicCountries.length) return "";
    if (selectedCountryId && publicCountries.some((c) => c.countryId === selectedCountryId)) {
      return selectedCountryId;
    }
    return (
      publicCountries.find(
        (country) => country.isoCode.trim().toUpperCase() === DEFAULT_DISTRIBUTOR_COUNTRY_ISO,
      )?.countryId ?? publicCountries[0].countryId
    );
  }, [publicCountries, selectedCountryId]);

  useEffect(() => {
    if (!resolvedCountryId || resolvedCountryId === selectedCountryId) return;
    setSelectedCountryId(resolvedCountryId);
  }, [resolvedCountryId, selectedCountryId]);

  const effectiveCountry = useMemo((): PublicCountryRow | null => {
    if (!resolvedCountryId) return null;
    return publicCountries.find((c) => c.countryId === resolvedCountryId) ?? null;
  }, [publicCountries, resolvedCountryId]);

  const bounds = useMemo(() => {
    if (!effectiveCountry) {
      return {
        min: PLATFORM_NATIONAL_PHONE_LEN_MIN,
        max: PLATFORM_NATIONAL_PHONE_LEN_MAX,
      };
    }
    return nationalDigitsBounds(effectiveCountry);
  }, [effectiveCountry]);

  const flagEmoji = effectiveCountry ? countryFlagEmoji(effectiveCountry.isoCode) : "";
  /** Dial shown next to flag; fallback if DB `phoneCode` empty (native `<select>` also hides emoji on many browsers). */
  const dialDisplay =
    effectiveCountry?.phoneCode?.trim() ||
    (effectiveCountry?.isoCode ? `(${effectiveCountry.isoCode})` : "");
  const multiCountry = publicCountries.length > 1;
  const nationalDigits = nationalPhone.replace(/\D/g, "");
  const nationalDigitsCount = nationalDigits.length;
  const hasValidNational =
    Boolean(effectiveCountry) &&
    nationalDigitsCount >= bounds.min &&
    nationalDigitsCount <= bounds.max;

  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return;
    const t = window.setInterval(() => {
      setResendIn((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [step, resendIn]);

  useEffect(() => {
    if (otpCode.length < 6) lastAutoOtpRef.current = "";
  }, [otpCode]);

  async function sendOtp() {
    setError(null);
    if (!effectiveCountry) {
      setError(
        countriesLoading
          ? "Loading…"
          : "No countries returned from the API. Run backend migrations (they seed default countries), confirm GET /api/v1/countries, and check VITE_API_URL.",
      );
      return;
    }
    const digits = nationalPhone.replace(/\D/g, "");
    const { min, max } = nationalDigitsBounds(effectiveCountry);
    if (digits.length < min || digits.length > max) {
      setError(
        `Enter a valid mobile number for ${effectiveCountry.phoneCode || "this country"} (national number only, no country code).`,
      );
      return;
    }
    setLoading(true);
    try {
      const response = await apiPost<{ expiresInMinutes: number; developmentCode?: string }>(
        "/auth/send-otp",
        {
          purpose: DISTRIBUTOR_OTP_PURPOSE,
          countryId: effectiveCountry.countryId,
          nationalPhone: digits,
        },
        { skipAuth: true },
      );
      setStep("otp");
      const localCode = /^\d{6}$/.test(response.developmentCode ?? "")
        ? response.developmentCode!
        : null;
      setDevelopmentOtp(localCode);
      setOtpCode(localCode ?? "");
      lastAutoOtpRef.current = "";
      setResendIn(30);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send OTP.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const verifyOtp = useCallback(async () => {
    setError(null);
    if (!effectiveCountry) {
      setError("Session error. Refresh the page.");
      return;
    }
    const digits = nationalPhone.replace(/\D/g, "");
    const { min, max } = nationalDigitsBounds(effectiveCountry);
    if (digits.length < min || digits.length > max) {
      setError(
        `Enter a valid mobile number for ${effectiveCountry.phoneCode || "this country"} (national number only, no country code).`,
      );
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const resolvedDevice = ensureDeviceId();
      setDeviceId(resolvedDevice);
      const res = await apiPost<TenantStaffLoginResponse>(
        "/auth/verify-otp",
        {
          purpose: DISTRIBUTOR_OTP_PURPOSE,
          countryId: effectiveCountry.countryId,
          nationalPhone: digits,
          code: otpCode.trim(),
          deviceId: resolvedDevice,
        },
        { skipAuth: true },
      );
      if (!res.accessToken || !res.refreshToken) {
        setError("Unexpected response from server.");
        return;
      }
      setTokens(res.accessToken, res.refreshToken);
      setAuthSession({
        sub: '',
        tenantId: getTenantIdFromAccessToken(res.accessToken),
        role: getRoleFromAccessToken(res.accessToken) ?? 'OWNER',
      });
      try {
        if (effectiveCountry.isoCode) {
          localStorage.setItem(DISTRIBUTOR_COUNTRY_ISO_KEY, effectiveCountry.isoCode.toUpperCase());
        }
        localStorage.setItem(DISTRIBUTOR_COUNTRY_ID_KEY, effectiveCountry.countryId);
        if (effectiveCountry.name?.trim()) {
          localStorage.setItem(DISTRIBUTOR_COUNTRY_NAME_KEY, effectiveCountry.name.trim());
        }
        const pc = effectiveCountry.phoneCode?.trim() ?? "";
        const displayPhone =
          digits.length > 0 ? `${pc ? `${pc} ` : ""}${digits}`.trim() : "";
        if (displayPhone) {
          localStorage.setItem(DISTRIBUTOR_LOGIN_PHONE_KEY, displayPhone);
        }
      } catch {
        /* ignore */
      }
      const tenantId = getTenantIdFromAccessToken(res.accessToken);
      let onboardingComplete = true;
      if (tenantId) {
        try {
          const s = await fetchDistributorOnboardingStatus();
          onboardingComplete = s.status === "complete";
        } catch {
          onboardingComplete = false;
        }
      }
      if (tenantId && !onboardingComplete) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate(from.startsWith("/login") ? "/" : from, { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [effectiveCountry, nationalPhone, otpCode, navigate, from]);

  useEffect(() => {
    if (step !== "otp" || loading) return;
    if (otpCode.length !== 6) return;
    if (otpCode === lastAutoOtpRef.current) return;
    lastAutoOtpRef.current = otpCode;
    void verifyOtp();
  }, [otpCode, step, loading, verifyOtp]);

  function onCountryChange(id: string) {
    setSelectedCountryId(id);
    const c = publicCountries.find((x) => x.countryId === id);
    if (!c) return;
    const { max } = nationalDigitsBounds(c);
    setNationalPhone((p) => p.replace(/\D/g, "").slice(0, max));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Distributor login</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in with mobile OTP — no password.</p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {step === "phone" ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="lp-phone">
                Phone number <span className="text-red-600">*</span>
              </label>
              <div className="mt-1 flex min-h-[2.75rem] rounded-lg border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/30">
                <div className="flex min-w-0 shrink-0 items-stretch border-r border-slate-200 bg-slate-50">
                  {countriesLoading ? (
                    <span className="flex items-center px-3 py-2.5 text-sm text-slate-400">
                      …
                    </span>
                  ) : !effectiveCountry ? (
                    <span className="flex items-center px-3 py-2.5 text-sm text-slate-400">—</span>
                  ) : (
                    <div className="flex min-w-0 max-w-[min(100%,13rem)] items-center gap-1.5 px-2 py-2 sm:max-w-[14rem]">
                      <span
                        className="shrink-0 text-lg leading-none"
                        title={effectiveCountry.name}
                        aria-hidden
                      >
                        {flagEmoji || "·"}
                      </span>
                      <span
                        className="shrink-0 text-sm font-semibold tabular-nums text-slate-800"
                        title={effectiveCountry.name}
                      >
                        {dialDisplay || "—"}
                      </span>
                      {multiCountry ? (
                        <select
                          aria-label="Country"
                          className="min-w-0 flex-1 cursor-pointer truncate rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-medium text-slate-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 disabled:opacity-60"
                          value={resolvedCountryId}
                          onChange={(e) => onCountryChange(e.target.value)}
                          disabled={!publicCountries.length}
                        >
                          {[...publicCountries]
                            .sort((a, b) => a.isoCode.localeCompare(b.isoCode))
                            .map((c) => {
                              const dial = (c.phoneCode ?? "").trim();
                              const label =
                                dial && c.name?.trim()
                                  ? `${dial} · ${c.name}`
                                  : dial || c.name?.trim() || c.isoCode;
                              return (
                                <option key={c.countryId} value={c.countryId}>
                                  {label}
                                </option>
                              );
                            })}
                        </select>
                      ) : null}
                    </div>
                  )}
                </div>
                <input
                  id="lp-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete={multiCountry ? "tel" : "tel-national"}
                  placeholder="Your mobile number"
                  maxLength={Math.max(bounds.max, 1)}
                  disabled={countriesLoading || !effectiveCountry}
                  className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 disabled:bg-slate-50"
                  value={nationalPhone}
                  onChange={(e) =>
                    setNationalPhone(e.target.value.replace(/\D/g, "").slice(0, bounds.max))
                  }
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Enter your mobile number without the country code. We&apos;ll send a one-time code
                by SMS (valid for 5 minutes).
              </p>
            </div>
            <button
              type="button"
              disabled={loading || countriesLoading || !effectiveCountry || !hasValidNational}
              onClick={() => void sendOtp()}
              className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-600">
              Code sent to{" "}
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                <span aria-hidden>{flagEmoji}</span>
                <span>
                  {dialDisplay} {nationalPhone.replace(/\D/g, "")}
                </span>
              </span>
            </p>
            {developmentOtp ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
                Local development OTP: <span className="font-mono font-semibold">{developmentOtp}</span>
              </p>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="lp-otp">
                Enter OTP
              </label>
              <input
                id="lp-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="• • • • • •"
                disabled={loading}
                aria-busy={loading}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-center font-mono text-2xl tracking-[0.35em] shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 disabled:bg-slate-50"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            {loading && step === "otp" ? (
              <p className="text-center text-sm font-medium text-emerald-700">Verifying…</p>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={loading || resendIn > 0}
                onClick={() => void sendOtp()}
                className="text-sm font-medium text-emerald-700 hover:underline disabled:text-slate-400 disabled:no-underline"
              >
                {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
              </button>
              <button
                type="button"
                className="text-sm text-slate-600 hover:text-slate-900"
                onClick={() => {
                  setStep("phone");
                  setOtpCode("");
                  setDevelopmentOtp(null);
                  lastAutoOtpRef.current = "";
                  setError(null);
                }}
              >
                Change number
              </button>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          New here? Enter your mobile — we create your distributor workspace after OTP verification.
        </p>
      </div>
    </div>
  );
}
